package com.aftaab.rezumate.data

import com.aftaab.rezumate.data.local.LocalVariantAdapter
import com.aftaab.rezumate.data.local.LocalVariantRecord
import com.aftaab.rezumate.domain.ATSAnalysisResult
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonObject

data class AnalyzedVariant(
    val id: String,
    val resumeId: String,
    val variantName: String,
    val tailoredContent: String,
    val atsScore: Int,
    val analysisFeedback: ATSAnalysisResult,
    val createdAt: String,
    val updatedAt: String,
)

class ATSAnalysisRecordAdapter(
    private val json: Json = Json { ignoreUnknownKeys = true },
) : LocalVariantAdapter<AnalyzedVariant> {
    override fun toRecord(variant: AnalyzedVariant): LocalVariantRecord = LocalVariantRecord(
        id = variant.id,
        resumeId = variant.resumeId,
        variantName = variant.variantName,
        tailoredContent = variant.tailoredContent,
        atsScore = variant.atsScore,
        analysisFeedback = json.encodeToJsonElement(variant.analysisFeedback).jsonObject,
        createdAt = variant.createdAt,
        updatedAt = variant.updatedAt,
    )

    override fun fromRecord(record: LocalVariantRecord): AnalyzedVariant = AnalyzedVariant(
        id = record.id,
        resumeId = record.resumeId,
        variantName = record.variantName,
        tailoredContent = record.tailoredContent,
        atsScore = record.atsScore,
        analysisFeedback = json.decodeFromJsonElement(record.analysisFeedback),
        createdAt = record.createdAt,
        updatedAt = record.updatedAt,
    )
}
