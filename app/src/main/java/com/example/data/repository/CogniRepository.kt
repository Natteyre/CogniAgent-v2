package com.example.data.repository

import com.example.data.db.ChatMessageDao
import com.example.data.db.ChatMessageEntity
import com.example.data.db.RoutineTriggerDao
import com.example.data.db.RoutineTriggerEntity
import com.example.data.db.SkillDao
import com.example.data.db.SkillEntity
import com.example.data.model.ChatMessage
import com.example.data.model.RoutineAction
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class CogniRepository(
    private val chatMessageDao: ChatMessageDao,
    private val skillDao: SkillDao,
    private val routineTriggerDao: RoutineTriggerDao
) {
    private val json = Json { ignoreUnknownKeys = true; prettyPrint = false }

    val messages: Flow<List<ChatMessage>> = chatMessageDao.getAllMessages().map { list ->
        list.map { entity ->
            ChatMessage(
                id = entity.id,
                text = entity.text,
                isUser = entity.isUser,
                timestamp = entity.timestamp,
                toolInvocation = entity.toolInvocation
            )
        }
    }

    suspend fun addMessage(text: String, isUser: Boolean, toolInvocation: String? = null): Long {
        return chatMessageDao.insertMessage(
            ChatMessageEntity(
                text = text,
                isUser = isUser,
                timestamp = System.currentTimeMillis(),
                toolInvocation = toolInvocation
            )
        )
    }

    suspend fun clearMessages() {
        chatMessageDao.clearAllMessages()
    }

    val skills: Flow<List<SkillEntity>> = skillDao.getAllSkills()

    suspend fun getSkillByName(name: String): SkillEntity? {
        return skillDao.getSkillByName(name)
    }

    suspend fun saveSkill(name: String, actions: List<RoutineAction>): Long {
        val actionsJson = json.encodeToString(actions)
        return skillDao.insertSkill(SkillEntity(name = name, actionsJson = actionsJson))
    }

    suspend fun updateSkill(id: Long, name: String, actions: List<RoutineAction>) {
        val actionsJson = json.encodeToString(actions)
        skillDao.updateSkill(SkillEntity(id = id, name = name, actionsJson = actionsJson))
    }

    suspend fun deleteSkill(id: Long) {
        skillDao.deleteSkillById(id)
    }

    val triggers: Flow<List<RoutineTriggerEntity>> = routineTriggerDao.getAllTriggers()

    suspend fun saveTrigger(triggerType: String, skillName: String, enabled: Boolean = true): Long {
        return routineTriggerDao.insertTrigger(
            RoutineTriggerEntity(
                triggerType = triggerType,
                associatedSkillName = skillName,
                enabled = enabled
            )
        )
    }

    suspend fun updateTrigger(trigger: RoutineTriggerEntity) {
        routineTriggerDao.updateTrigger(trigger)
    }

    suspend fun deleteTrigger(id: Long) {
        routineTriggerDao.deleteTriggerById(id)
    }

    suspend fun getActiveTriggersByType(triggerType: String): List<RoutineTriggerEntity> {
        return routineTriggerDao.getActiveTriggersByType(triggerType)
    }
}
