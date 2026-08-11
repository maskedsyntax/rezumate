package com.aftaab.rezumate.billing

import android.content.Context
import android.util.Base64
import com.aftaab.rezumate.BuildConfig
import com.google.android.gms.tasks.Task
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.StandardIntegrityManager
import java.io.IOException
import java.security.MessageDigest
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.suspendCancellableCoroutine

fun interface IntegrityTokenProvider {
    suspend fun tokenFor(request: PaymentVerificationRequest): String
}

class PlayIntegrityTokenProvider(
    context: Context,
    private val cloudProjectNumber: Long = BuildConfig.PLAY_CLOUD_PROJECT_NUMBER,
) : IntegrityTokenProvider {
    private val manager = IntegrityManagerFactory.createStandard(context.applicationContext)
    private val preparationMutex = Mutex()
    @Volatile private var provider: StandardIntegrityManager.StandardIntegrityTokenProvider? = null

    override suspend fun tokenFor(request: PaymentVerificationRequest): String {
        if (cloudProjectNumber <= 0) {
            throw PaymentBackendException(
                "Play Integrity cloud project number is not configured.",
                retryable = false,
            )
        }
        val tokenProvider = provider ?: prepareProvider()
        val tokenRequest = StandardIntegrityManager.StandardIntegrityTokenRequest.builder()
            .setRequestHash(request.requestHash())
            .build()
        return try {
            tokenProvider.request(tokenRequest).await().token()
        } catch (error: Exception) {
            provider = null
            throw PaymentBackendException(
                "Could not verify this app installation with Google Play.",
                retryable = true,
                cause = error,
            )
        }
    }

    private suspend fun prepareProvider(): StandardIntegrityManager.StandardIntegrityTokenProvider =
        preparationMutex.withLock {
            provider?.let { return@withLock it }
            val request = StandardIntegrityManager.PrepareIntegrityTokenRequest.builder()
                .setCloudProjectNumber(cloudProjectNumber)
                .build()
            try {
                manager.prepareIntegrityToken(request).await().also { provider = it }
            } catch (error: Exception) {
                throw IOException("Could not initialize Play Integrity.", error)
            }
        }

    private fun PaymentVerificationRequest.requestHash(): String {
        val payload = "$packageName\n$productId\n$purchaseToken"
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(payload.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(
            digest,
            Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING,
        )
    }
}

private suspend fun <T> Task<T>.await(): T = suspendCancellableCoroutine { continuation ->
    addOnSuccessListener { result ->
        if (continuation.isActive) continuation.resume(result)
    }
    addOnFailureListener { error ->
        if (continuation.isActive) continuation.resumeWithException(error)
    }
}
