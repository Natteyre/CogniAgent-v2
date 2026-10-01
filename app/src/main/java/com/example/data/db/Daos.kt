package com.example.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface SkillDao {
    @Query("SELECT * FROM skills ORDER BY id DESC")
    fun getAllSkills(): Flow<List<SkillEntity>>

    @Query("SELECT * FROM skills WHERE name = :name LIMIT 1")
    suspend fun getSkillByName(name: String): SkillEntity?

    @Query("SELECT * FROM skills WHERE id = :id LIMIT 1")
    suspend fun getSkillById(id: Long): SkillEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSkill(skill: SkillEntity): Long

    @Update
    suspend fun updateSkill(skill: SkillEntity)

    @Query("DELETE FROM skills WHERE id = :id")
    suspend fun deleteSkillById(id: Long)
}

@Dao
interface RoutineTriggerDao {
    @Query("SELECT * FROM routine_triggers ORDER BY id DESC")
    fun getAllTriggers(): Flow<List<RoutineTriggerEntity>>

    @Query("SELECT * FROM routine_triggers WHERE trigger_type = :triggerType AND enabled = 1")
    suspend fun getActiveTriggersByType(triggerType: String): List<RoutineTriggerEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTrigger(trigger: RoutineTriggerEntity): Long

    @Update
    suspend fun updateTrigger(trigger: RoutineTriggerEntity)

    @Query("DELETE FROM routine_triggers WHERE id = :id")
    suspend fun deleteTriggerById(id: Long)
}

@Dao
interface ChatMessageDao {
    @Query("SELECT * FROM chat_messages ORDER BY timestamp ASC")
    fun getAllMessages(): Flow<List<ChatMessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: ChatMessageEntity): Long

    @Query("DELETE FROM chat_messages")
    suspend fun clearAllMessages()
}
