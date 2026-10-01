package com.example

import com.example.data.model.ActionType
import com.example.data.model.RoutineAction
import com.example.data.model.ExtractedEntity
import com.example.data.model.ParsedIntent
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Locale
import java.util.regex.Pattern

class ExampleUnitTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `verify routine actions serialization and deserialization`() {
        val actions = listOf(
            RoutineAction(type = ActionType.SPEAK, parameter1 = "Test mowy"),
            RoutineAction(type = ActionType.TOGGLE_HARDWARE, parameter1 = "torch", parameter2 = "on"),
            RoutineAction(type = ActionType.DELAY, parameter1 = "1500"),
            RoutineAction(type = ActionType.OPEN_APP, parameter1 = "com.google.android.youtube")
        )

        val serialized = json.encodeToString(actions)
        assertNotNull(serialized)
        assertTrue(serialized.contains("TOGGLE_HARDWARE"))

        val deserialized = json.decodeFromString<List<RoutineAction>>(serialized)
        assertEquals(4, deserialized.size)
        assertEquals(ActionType.SPEAK, deserialized[0].type)
        assertEquals("torch", deserialized[1].parameter1)
        assertEquals("1500", deserialized[2].parameter1)
    }

    @Test
    fun `verify polish multi-intent sentence splitting`() {
        val compoundCommand = "włącz latarkę i wyłącz bluetooth a następnie otwórz kalkulator"
        val coordinatorRegex = Pattern.compile(
            "\\b(a\\s+następnie|a\\s+nastepnie|następnie|nastepnie|a\\s+potem|potem|oraz|i\\s+wtedy|i)\\b",
            Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
        )
        val matcher = coordinatorRegex.matcher(compoundCommand)
        val segments = mutableListOf<String>()
        var lastEnd = 0

        while (matcher.find()) {
            val start = matcher.start()
            val segment = compoundCommand.substring(lastEnd, start).trim(' ', ',', ';')
            if (segment.isNotEmpty()) {
                segments.add(segment)
            }
            lastEnd = matcher.end()
        }
        val lastSegment = compoundCommand.substring(lastEnd).trim(' ', ',', ';')
        if (lastSegment.isNotEmpty()) {
            segments.add(lastSegment)
        }

        assertEquals(3, segments.size)
        assertEquals("włącz latarkę", segments[0])
        assertEquals("wyłącz bluetooth", segments[1])
        assertEquals("otwórz kalkulator", segments[2])
    }

    @Test
    fun `verify polish hardware pattern recognition`() {
        val text = "włącz latarkę"
        val lower = text.lowercase(Locale("pl", "PL"))
        val isTorch = lower.contains("latark") || lower.contains("światł")
        val isOn = lower.contains("włącz") || lower.contains("zapal")

        assertTrue(isTorch)
        assertTrue(isOn)
    }

    @Test
    fun `verify screen and gesture actions serialization`() {
        val actions = listOf(
            RoutineAction(type = ActionType.SUMMARIZE_SCREEN),
            RoutineAction(type = ActionType.SWIPE_SCREEN, parameter1 = "down"),
            RoutineAction(type = ActionType.TAP_COORDINATE, parameter1 = "500,1200")
        )
        val serialized = json.encodeToString(actions)
        assertTrue(serialized.contains("SUMMARIZE_SCREEN"))
        assertTrue(serialized.contains("SWIPE_SCREEN"))

        val deserialized = json.decodeFromString<List<RoutineAction>>(serialized)
        assertEquals(3, deserialized.size)
        assertEquals(ActionType.SUMMARIZE_SCREEN, deserialized[0].type)
        assertEquals(ActionType.SWIPE_SCREEN, deserialized[1].type)
        assertEquals(ActionType.TAP_COORDINATE, deserialized[2].type)
    }
}
