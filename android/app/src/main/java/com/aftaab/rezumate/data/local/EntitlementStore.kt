package com.aftaab.rezumate.data.local

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.rezumateEntitlementDataStore by preferencesDataStore(name = "rezumate_entitlement")

class EntitlementStore(
    context: Context,
) {
    private val dataStore = context.applicationContext.rezumateEntitlementDataStore

    suspend fun loadAcknowledgedPro(): Boolean =
        dataStore.data.first()[ACKNOWLEDGED_PRO] ?: false

    suspend fun setAcknowledgedPro(value: Boolean) {
        dataStore.edit { it[ACKNOWLEDGED_PRO] = value }
    }

    private companion object {
        val ACKNOWLEDGED_PRO = booleanPreferencesKey("acknowledged_pro")
    }
}
