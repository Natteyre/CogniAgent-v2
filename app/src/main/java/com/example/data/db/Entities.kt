package com.example.data.db

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "skills")
data class SkillEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    @ColumnInfo(name = "actions_json")
    val actionsJson: String,
    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "routine_triggers")
data class RoutineTriggerEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    @ColumnInfo(name = "trigger_type")
    val triggerType: String, // e.g., "ACTION_POWER_CONNECTED", "ACTION_POWER_DISCONNECTED", "SCHEDULE_TIME"
    @ColumnInfo(name = "associated_skill_name")
    val associatedSkillName: String,
    val enabled: Boolean = true
)

@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val text: String,
    @ColumnInfo(name = "is_user")
    val isUser: Boolean,
    val timestamp: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "tool_invocation")
    val toolInvocation: String? = null
)
