package com.example.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [SkillEntity::class, RoutineTriggerEntity::class, ChatMessageEntity::class],
    version = 1,
    exportSchema = false
)
abstract class CogniDatabase : RoomDatabase() {
    abstract fun skillDao(): SkillDao
    abstract fun routineTriggerDao(): RoutineTriggerDao
    abstract fun chatMessageDao(): ChatMessageDao

    companion object {
        @Volatile
        private var INSTANCE: CogniDatabase? = null

        fun getInstance(context: Context): CogniDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    CogniDatabase::class.java,
                    "cogni_agent.db"
                )
                    .fallbackToDestructiveMigration()
                    .addCallback(object : Callback() {
                        override fun onCreate(db: SupportSQLiteDatabase) {
                            super.onCreate(db)
                            CoroutineScope(Dispatchers.IO).launch {
                                INSTANCE?.let { populateInitialData(it) }
                            }
                        }
                    })
                    .build()
                INSTANCE = instance
                instance
            }
        }

        private suspend fun populateInitialData(database: CogniDatabase) {
            val skillDao = database.skillDao()
            val triggerDao = database.routineTriggerDao()
            val chatDao = database.chatMessageDao()

            // Seed Skill 1: Nocny Spoczynek
            val actionsSkill1 = """[{"type":"SPEAK","parameter1":"Aktywuję procedurę nocną. Wyłączam Bluetooth i latarkę.","parameter2":""},{"type":"TOGGLE_HARDWARE","parameter1":"bluetooth","parameter2":"off"},{"type":"TOGGLE_HARDWARE","parameter1":"torch","parameter2":"off"},{"type":"DELAY","parameter1":"500","parameter2":""},{"type":"SPEAK","parameter1":"System w trybie oszczędzania energii. Dobranoc.","parameter2":""}]"""
            skillDao.insertSkill(SkillEntity(name = "Nocny Spoczynek", actionsJson = actionsSkill1))

            // Seed Skill 2: Poranna Rutyna
            val actionsSkill2 = """[{"type":"SPEAK","parameter1":"Dzień dobry! CogniAgent aktywny. Rozpoczynam poranny przegląd.","parameter2":""},{"type":"DELAY","parameter1":"1000","parameter2":""},{"type":"SPEAK","parameter1":"Wszystkie moduły NLU i hardware działają optymalnie na procesorze Kirin 980.","parameter2":""}]"""
            skillDao.insertSkill(SkillEntity(name = "Poranna Rutyna", actionsJson = actionsSkill2))

            // Seed Skill 3: Test Hardware
            val actionsSkill3 = """[{"type":"SPEAK","parameter1":"Testuję diodę latarki.","parameter2":""},{"type":"TOGGLE_HARDWARE","parameter1":"torch","parameter2":"on"},{"type":"DELAY","parameter1":"1500","parameter2":""},{"type":"TOGGLE_HARDWARE","parameter1":"torch","parameter2":"off"},{"type":"SPEAK","parameter1":"Test sprzętowy zakończony sukcesem.","parameter2":""}]"""
            skillDao.insertSkill(SkillEntity(name = "Test Dioda LED", actionsJson = actionsSkill3))

            // Seed Triggers
            triggerDao.insertTrigger(
                RoutineTriggerEntity(
                    triggerType = "ACTION_POWER_CONNECTED",
                    associatedSkillName = "Poranna Rutyna",
                    enabled = true
                )
            )
            triggerDao.insertTrigger(
                RoutineTriggerEntity(
                    triggerType = "ACTION_POWER_DISCONNECTED",
                    associatedSkillName = "Nocny Spoczynek",
                    enabled = false
                )
            )

            // Seed Welcome Chat Message
            chatDao.insertMessage(
                ChatMessageEntity(
                    text = "Witaj w CogniAgent v2! Jestem Twoim lokalno-chmurowym asystentem AI zoptymalizowanym dla procesora Kirin 980. W czym mogę pomóc?",
                    isUser = false
                )
            )
        }
    }
}
