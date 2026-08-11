package com.aftaab.rezumate.billing

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PaymentBackendResponseParserTest {
    @Test
    fun `request uses backend contract keys`() {
        val encoded = Json.encodeToString(
            PaymentVerificationRequest(
                purchaseToken = "token",
                productId = REZUMATE_PRO_PRODUCT_ID,
                packageName = "com.aftaab.rezumate",
                integrityToken = "integrity-token",
            ),
        )

        assertTrue(encoded.contains("\"purchaseToken\":\"token\""))
        assertTrue(encoded.contains("\"productId\":\"rezumate_pro_lifetime\""))
        assertTrue(encoded.contains("\"packageName\":\"com.aftaab.rezumate\""))
        assertTrue(encoded.contains("\"integrityToken\":\"integrity-token\""))
    }

    @Test
    fun `parser accepts nested snake case response and unknown fields`() {
        val response = PaymentBackendResponseParser.parse(
            """{"data":{"is_verified":true,"is_acknowledged":"true","message":"restored","extra":1}}""",
        )

        assertTrue(response.verified)
        assertTrue(response.acknowledged)
        assertEquals("restored", response.message)
    }

    @Test
    fun `missing acknowledgement remains locked`() {
        val response = PaymentBackendResponseParser.parse("""{"verified":true}""")
        val state = BillingStateLogic.verificationFinished(BillingState(), response)

        assertTrue(response.verified)
        assertFalse(response.acknowledged)
        assertFalse(state.isPro)
    }

    @Test
    fun `backend entitlement response unlocks only when acknowledged`() {
        val response = PaymentBackendResponseParser.parse(
            """{"entitled":true,"acknowledged":true,"status":"PURCHASED_ACKNOWLEDGED"}""",
        )

        assertTrue(response.verified)
        assertTrue(response.acknowledged)
        assertTrue(BillingStateLogic.verificationFinished(BillingState(), response).isPro)
    }

    @Test
    fun `explicit false takes precedence over nested true`() {
        val response = PaymentBackendResponseParser.parse(
            """{"verified":false,"acknowledged":false,"data":{"verified":true,"acknowledged":true}}""",
        )

        assertFalse(response.verified)
        assertFalse(response.acknowledged)
    }
}
