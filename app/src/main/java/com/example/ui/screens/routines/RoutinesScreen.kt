package com.example.ui.screens.routines

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.FlashlightOn
import androidx.compose.material.icons.filled.HourglassBottom
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Power
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.SmartButton
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.db.RoutineTriggerEntity
import com.example.data.db.SkillEntity
import com.example.data.model.ActionType
import com.example.data.model.RoutineAction
import kotlinx.serialization.json.Json

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoutinesScreen(
    skills: List<SkillEntity>,
    triggers: List<RoutineTriggerEntity>,
    onExecuteSkill: (SkillEntity) -> Unit,
    onSaveSkill: (String, List<RoutineAction>) -> Unit,
    onDeleteSkill: (Long) -> Unit,
    onSaveTrigger: (String, String) -> Unit,
    onToggleTrigger: (RoutineTriggerEntity) -> Unit,
    onDeleteTrigger: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var showCreateSkillDialog by remember { mutableStateOf(false) }
    var showCreateTriggerDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Header
        Surface(
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                Text(
                    text = "Kreator Makr i Umiejętności",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Automatyzacja procesów Kirin 980 i wyzwalacze zdarzeń",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(12.dp))

                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.primary
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text("Umiejętności (${skills.size})") },
                        modifier = Modifier.testTag("tab_skills")
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("Wyzwalacze (${triggers.size})") },
                        modifier = Modifier.testTag("tab_triggers")
                    )
                }
            }
        }

        // Body Content
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            if (selectedTab == 0) {
                // Skills List & Add Button
                Column(modifier = Modifier.fillMaxSize()) {
                    Button(
                        onClick = { showCreateSkillDialog = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("add_skill_button"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        Icon(imageVector = Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Stwórz nową umiejętność (+ Add Skill)")
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (skills.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Brak zdefiniowanych umiejętności. Kliknij powyższy przycisk, aby stworzyć pierwsze makro.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            contentPadding = PaddingValues(bottom = 16.dp)
                        ) {
                            items(skills, key = { it.id }) { skill ->
                                SkillItemCard(
                                    skill = skill,
                                    onRun = { onExecuteSkill(skill) },
                                    onDelete = { onDeleteSkill(skill.id) }
                                )
                            }
                        }
                    }
                }
            } else {
                // Triggers List & Add Button
                Column(modifier = Modifier.fillMaxSize()) {
                    Button(
                        onClick = { showCreateTriggerDialog = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("add_trigger_button"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.secondary,
                            contentColor = MaterialTheme.colorScheme.onSecondary
                        )
                    ) {
                        Icon(imageVector = Icons.Default.Bolt, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Powiąż wyzwalacz sprzętowy (+ Add Trigger)")
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (triggers.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Brak powiązanych wyzwalaczy. Możesz dodać reakcję na podłączenie ładowarki.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            contentPadding = PaddingValues(bottom = 16.dp)
                        ) {
                            items(triggers, key = { it.id }) { trigger ->
                                TriggerItemCard(
                                    trigger = trigger,
                                    onToggle = { onToggleTrigger(trigger) },
                                    onDelete = { onDeleteTrigger(trigger.id) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreateSkillDialog) {
        CreateSkillDialog(
            onDismiss = { showCreateSkillDialog = false },
            onSave = { name, actions ->
                onSaveSkill(name, actions)
                showCreateSkillDialog = false
            }
        )
    }

    if (showCreateTriggerDialog) {
        CreateTriggerDialog(
            availableSkills = skills.map { it.name },
            onDismiss = { showCreateTriggerDialog = false },
            onSave = { triggerType, skillName ->
                onSaveTrigger(triggerType, skillName)
                showCreateTriggerDialog = false
            }
        )
    }
}

@Composable
fun SkillItemCard(
    skill: SkillEntity,
    onRun: () -> Unit,
    onDelete: () -> Unit
) {
    val actionsCount = remember(skill.actionsJson) {
        try {
            val json = Json { ignoreUnknownKeys = true }
            json.decodeFromString<List<RoutineAction>>(skill.actionsJson).size
        } catch (e: Exception) {
            0
        }
    }

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("skill_card_${skill.id}")
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = skill.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Liczba akcji w sekwencji: $actionsCount",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Button(
                    onClick = onRun,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    ),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    modifier = Modifier.testTag("run_skill_${skill.id}")
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Uruchom",
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Uruchom", fontSize = 12.sp)
                }

                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.testTag("delete_skill_${skill.id}")
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Usuń",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@Composable
fun TriggerItemCard(
    trigger: RoutineTriggerEntity,
    onToggle: () -> Unit,
    onDelete: () -> Unit
) {
    val triggerLabel = when (trigger.triggerType) {
        "ACTION_POWER_CONNECTED" -> "Podłączenie ładowarki (Zasilanie)"
        "ACTION_POWER_DISCONNECTED" -> "Odłączenie ładowarki"
        else -> trigger.triggerType
    }

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("trigger_card_${trigger.id}")
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.secondaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Power,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Column {
                    Text(
                        text = triggerLabel,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "Umiejętność: ${trigger.associatedSkillName}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(
                    checked = trigger.enabled,
                    onCheckedChange = { onToggle() },
                    colors = SwitchDefaults.colors(checkedThumbColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.testTag("toggle_trigger_${trigger.id}")
                )

                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.testTag("delete_trigger_${trigger.id}")
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Usuń",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateSkillDialog(
    onDismiss: () -> Unit,
    onSave: (String, List<RoutineAction>) -> Unit
) {
    var skillName by remember { mutableStateOf("") }
    val actions = remember {
        mutableStateListOf(
            RoutineAction(type = ActionType.SPEAK, parameter1 = "Rozpoczynam rutynę"),
            RoutineAction(type = ActionType.DELAY, parameter1 = "1000")
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                "Kreator Umiejętności",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = skillName,
                    onValueChange = { skillName = it },
                    label = { Text("Nazwa umiejętności") },
                    placeholder = { Text("np. Tryb Kinowy") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("skill_name_input")
                )

                Text(
                    text = "Sekwencja Akcji:",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(240.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(actions.size) { index ->
                        val action = actions[index]
                        ActionEditorRow(
                            index = index,
                            action = action,
                            onUpdate = { updated -> actions[index] = updated },
                            onDelete = { actions.removeAt(index) }
                        )
                    }
                }

                Button(
                    onClick = {
                        actions.add(RoutineAction(type = ActionType.SPEAK, parameter1 = "Nowa akcja"))
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("add_action_in_dialog_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("+ Dodaj Akcję", color = MaterialTheme.colorScheme.primary)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (skillName.isNotBlank() && actions.isNotEmpty()) {
                        onSave(skillName.trim(), actions.toList())
                    }
                },
                enabled = skillName.isNotBlank() && actions.isNotEmpty(),
                modifier = Modifier.testTag("save_skill_button")
            ) {
                Text("Zapisz Umiejętność")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Anuluj")
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActionEditorRow(
    index: Int,
    action: RoutineAction,
    onUpdate: (RoutineAction) -> Unit,
    onDelete: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Krok ${index + 1}: ${action.type.name}",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Usuń krok",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Action Type Dropdown
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = it }
            ) {
                OutlinedTextField(
                    value = action.type.name,
                    onValueChange = {},
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(MenuAnchorType.PrimaryNotEditable),
                    colors = OutlinedTextFieldDefaults.colors()
                )
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    ActionType.values().forEach { type ->
                        DropdownMenuItem(
                            text = { Text(type.name) },
                            onClick = {
                                onUpdate(action.copy(type = type))
                                expanded = false
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Parameter Field
            val placeholder = when (action.type) {
                ActionType.SPEAK -> "Tekst do wypowiedzenia"
                ActionType.OPEN_APP -> "Nazwa pakietu (np. com.google.android.youtube)"
                ActionType.DELAY -> "Czas opóźnienia w ms (np. 1500)"
                ActionType.CLICK_NODE -> "Tekst klikanego przycisku na ekranie"
                ActionType.TOGGLE_HARDWARE -> "torch lub bluetooth"
                ActionType.SWIPE_SCREEN -> "Kierunek: up, down, left, right"
                ActionType.TAP_COORDINATE -> "Współrzędne X,Y (np. 500,1200)"
                ActionType.SUMMARIZE_SCREEN -> "Brak parametrów (odczytuje bieżący ekran)"
                ActionType.SET_TIMER -> "Czas w sekundach (np. 300 = 5 minut)"
                ActionType.SET_ALARM -> "Godzina budzika (np. 07:30)"
                ActionType.SET_VOLUME -> "Głośność w procentach 0-100 (np. 50)"
            }

            OutlinedTextField(
                value = action.parameter1,
                onValueChange = { onUpdate(action.copy(parameter1 = it)) },
                placeholder = { Text(placeholder, fontSize = 12.sp) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            if (action.type == ActionType.TOGGLE_HARDWARE || action.type == ActionType.SET_TIMER || action.type == ActionType.SET_ALARM) {
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = action.parameter2,
                    onValueChange = { onUpdate(action.copy(parameter2 = it)) },
                    placeholder = {
                        Text(
                            if (action.type == ActionType.TOGGLE_HARDWARE) "on lub off" else "Etykieta / Nazwa",
                            fontSize = 12.sp
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateTriggerDialog(
    availableSkills: List<String>,
    onDismiss: () -> Unit,
    onSave: (String, String) -> Unit
) {
    var selectedTriggerType by remember { mutableStateOf("ACTION_POWER_CONNECTED") }
    var selectedSkill by remember { mutableStateOf(availableSkills.firstOrNull() ?: "") }
    var triggerExpanded by remember { mutableStateOf(false) }
    var skillExpanded by remember { mutableStateOf(false) }

    val triggerOptions = listOf(
        "ACTION_POWER_CONNECTED" to "Podłączenie ładowarki (Power Connected)",
        "ACTION_POWER_DISCONNECTED" to "Odłączenie ładowarki (Power Disconnected)"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                "Powiąż Wyzwalacz Sprzętowy",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("Zdarzenie systemowe:", style = MaterialTheme.typography.labelMedium)

                ExposedDropdownMenuBox(
                    expanded = triggerExpanded,
                    onExpandedChange = { triggerExpanded = it }
                ) {
                    val label = triggerOptions.find { it.first == selectedTriggerType }?.second ?: selectedTriggerType
                    OutlinedTextField(
                        value = label,
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = triggerExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                    )
                    ExposedDropdownMenu(
                        expanded = triggerExpanded,
                        onDismissRequest = { triggerExpanded = false }
                    ) {
                        triggerOptions.forEach { (type, name) ->
                            DropdownMenuItem(
                                text = { Text(name) },
                                onClick = {
                                    selectedTriggerType = type
                                    triggerExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text("Przypisz umiejętność:", style = MaterialTheme.typography.labelMedium)

                if (availableSkills.isEmpty()) {
                    Text(
                        "Najpierw utwórz przynajmniej jedną umiejętność w zakładce Umiejętności.",
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 12.sp
                    )
                } else {
                    ExposedDropdownMenuBox(
                        expanded = skillExpanded,
                        onExpandedChange = { skillExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = selectedSkill,
                            onValueChange = {},
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = skillExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                        )
                        ExposedDropdownMenu(
                            expanded = skillExpanded,
                            onDismissRequest = { skillExpanded = false }
                        ) {
                            availableSkills.forEach { skillName ->
                                DropdownMenuItem(
                                    text = { Text(skillName) },
                                    onClick = {
                                        selectedSkill = skillName
                                        skillExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (selectedSkill.isNotBlank()) {
                        onSave(selectedTriggerType, selectedSkill)
                    }
                },
                enabled = selectedSkill.isNotBlank(),
                modifier = Modifier.testTag("save_trigger_button")
            ) {
                Text("Zapisz Powiązanie")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Anuluj")
            }
        }
    )
}
