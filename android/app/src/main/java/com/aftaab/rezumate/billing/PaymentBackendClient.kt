package com.aftaab.rezumate.billing

import com.aftaab.rezumate.BuildConfig
import java.io.IOException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response

fun interface PaymentBackend {
    suspend fun verify(request: PaymentVerificationRequest): PaymentVerificationResponse
}

class PaymentBackendException(
    message: String,
    val retryable: Boolean,
    cause: Throwable? = null,
) : IOException(message, cause)

class PaymentBackendClient(
    context: android.content.Context,
    private val backendUrl: String = BuildConfig.PAYMENT_BACKEND_URL,
    private val client: OkHttpClient = OkHttpClient(),
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val integrityTokenProvider: IntegrityTokenProvider = PlayIntegrityTokenProvider(context),
) : PaymentBackend {
    override suspend fun verify(request: PaymentVerificationRequest): PaymentVerificationResponse {
        if (backendUrl.isBlank()) {
            throw PaymentBackendException("Payment backend URL is not configured.", retryable = false)
        }

        val payload = request.copy(integrityToken = integrityTokenProvider.tokenFor(request))
        val httpRequest = try {
            Request.Builder()
                .url(backendUrl)
                .post(json.encodeToString(payload).toRequestBody(JSON_MEDIA_TYPE))
                .header("Accept", "application/json")
                .build()
        } catch (error: IllegalArgumentException) {
            throw PaymentBackendException("Payment backend URL is invalid.", false, error)
        }

        val response = try {
            client.newCall(httpRequest).await()
        } catch (error: IOException) {
            throw PaymentBackendException("Could not reach the payment backend.", true, error)
        }

        response.use {
            val body = it.body?.string().orEmpty()
            val parsed = runCatching { PaymentBackendResponseParser.parse(body, json) }.getOrNull()

            // An idempotent backend may report an already-processed token as a conflict.
            if ((it.isSuccessful || it.code == 409) && parsed != null) return parsed

            val message = parsed?.message?.takeIf(String::isNotBlank)
                ?: "Payment backend returned HTTP ${it.code}."
            throw PaymentBackendException(
                message = message,
                retryable = it.code == 408 || it.code == 429 || it.code >= 500,
            )
        }
    }

    private suspend fun Call.await(): Response = suspendCancellableCoroutine { continuation ->
        continuation.invokeOnCancellation { cancel() }
        enqueue(object : Callback {
            override fun onFailure(call: Call, error: IOException) {
                if (continuation.isActive) continuation.resumeWithException(error)
            }

            override fun onResponse(call: Call, response: Response) {
                if (continuation.isActive) continuation.resume(response) else response.close()
            }
        })
    }

    private companion object {
        val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    }
}

object PaymentBackendResponseParser {
    fun parse(
        body: String,
        json: Json = Json { ignoreUnknownKeys = true },
    ): PaymentVerificationResponse {
        val root = json.parseToJsonElement(body).jsonObject
        val candidates = buildList {
            add(root)
            listOf("data", "result", "purchase", "entitlement").forEach { key ->
                (root[key] as? JsonObject)?.let(::add)
            }
            (root["error"] as? JsonObject)?.let(::add)
        }
        val verified = candidates.firstBoolean(
            "verified",
            "is_verified",
            "purchase_verified",
            "valid",
            "entitled",
        ) ?: false
        val acknowledged = candidates.firstBoolean(
            "acknowledged",
            "is_acknowledged",
            "purchase_acknowledged",
        ) ?: false
        val message = candidates.firstString("message", "detail", "error")

        return PaymentVerificationResponse(
            verified = verified,
            acknowledged = acknowledged,
            message = message,
        )
    }

    private fun List<JsonObject>.firstBoolean(vararg keys: String): Boolean? {
        for (candidate in this) {
            for (key in keys) {
                val primitive = candidate[key] as? JsonPrimitive ?: continue
                primitive.booleanOrNull?.let { return it }
                when (primitive.contentOrNull?.lowercase()) {
                    "true" -> return true
                    "false" -> return false
                }
            }
        }
        return null
    }

    private fun List<JsonObject>.firstString(vararg keys: String): String? {
        for (candidate in this) {
            for (key in keys) {
                (candidate[key] as? JsonPrimitive)
                    ?.contentOrNull
                    ?.takeIf(String::isNotBlank)
                    ?.let {
                        return it
                    }
            }
        }
        return null
    }
}
