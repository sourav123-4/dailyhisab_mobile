import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppTheme } from '../theme/appTheme';
import { MuscleGroup, Equipment, Exercise } from '../types/fitness';
import { MuscleAnatomyViewer } from '../components/MuscleAnatomyViewer';
import { ExerciseVisualCard } from '../components/ExerciseVisualCard';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { ARMS_PARTS_BREAKDOWN } from '../data/exercisesData';

export const ExerciseExplorerScreen = () => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { exercises, addExerciseToActiveWorkout, activeWorkout } = useFitnessApp();

  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>('arms');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeExerciseModal, setActiveExerciseModal] = useState<Exercise | null>(null);
  const [activeHighlightPart, setActiveHighlightPart] = useState<string | undefined>(undefined);

  const equipmentOptions = [
    { id: 'all', label: 'All Gear' },
    { id: 'barbell', label: 'Barbell' },
    { id: 'dumbbell', label: 'Dumbbell' },
    { id: 'cable', label: 'Cable' },
    { id: 'machine', label: 'Machine' },
    { id: 'bodyweight', label: 'Bodyweight' },
  ];

  // Filter exercises
  const filteredExercises = exercises.filter((ex) => {
    const matchesMuscle = selectedMuscle === 'fullbody' || ex.muscleGroup === selectedMuscle;
    const matchesEquip = selectedEquipment === 'all' || ex.equipment === selectedEquipment;
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.primaryMuscles.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesMuscle && matchesEquip && matchesSearch;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.borderSoft, paddingTop: Math.max(insets.top, 14) }]}>
        <View>
          <Text style={[styles.headerSub, { color: theme.muted }]}>3D ANATOMY & WORKOUT DIRECTORY</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Muscle Explorer</Text>
        </View>
      </View>

      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Search Bar */}
            <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search exercises, biceps, chest, squat..."
                placeholderTextColor={theme.subtle}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={[styles.clearSearch, { color: theme.muted }]}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Interactive 3D Anatomy Model */}
            <MuscleAnatomyViewer
              selectedMuscle={selectedMuscle}
              onSelectMuscle={(m) => setSelectedMuscle(m)}
              showDetails={true}
            />

            {/* Equipment Filter Chips */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterTitle, { color: theme.muted }]}>EQUIPMENT FILTER:</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={equipmentOptions}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.chipList}
                renderItem={({ item }) => {
                  const isSel = selectedEquipment === item.id;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSel ? theme.primary : theme.surface,
                          borderColor: isSel ? theme.primary : theme.borderSoft,
                        },
                      ]}
                      onPress={() => setSelectedEquipment(item.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSel ? '#ffffff' : theme.text, fontWeight: isSel ? '800' : '500' },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            {/* ARMS ALL PARTS 3D BREAKDOWN (When Arms is selected) */}
            {selectedMuscle === 'arms' && (
              <View style={[styles.armsBreakdownBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                <View style={styles.armsBreakdownHeader}>
                  <Text style={styles.armsEmoji}>💪</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.armsTitle, { color: theme.text }]}>ARMS - ALL ANATOMICAL PARTS</Text>
                    <Text style={[styles.armsSub, { color: theme.muted }]}>Tap any part to view 3D biomechanical motion animation</Text>
                  </View>
                </View>

                <View style={styles.armsGrid}>
                  {ARMS_PARTS_BREAKDOWN.map((part) => (
                    <TouchableOpacity
                      key={part.id}
                      activeOpacity={0.75}
                      style={[styles.armPartCard, { backgroundColor: theme.surface, borderColor: `${part.color}66` }]}
                      onPress={() => {
                        const matchedEx = exercises.find((e) => e.id === part.primaryExerciseId) ||
                          exercises.find((e) =>
                            part.exercises.some((targetName) => e.name.toLowerCase().includes(targetName.toLowerCase()))
                          );
                        if (matchedEx) {
                          setActiveHighlightPart(part.id);
                          setActiveExerciseModal(matchedEx);
                        }
                      }}
                    >
                      <View style={[styles.partDot, { backgroundColor: part.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.partName, { color: theme.text }]}>{part.name}</Text>
                        <Text style={[styles.partTarget, { color: theme.muted }]}>{part.target}</Text>
                        <View style={styles.partTagRow}>
                          <Text style={[styles.partTag, { color: part.color }]}>⚡ 3D Biomechanical Motion ➔</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Count indicator */}
            <View style={styles.countRow}>
              <Text style={[styles.countText, { color: theme.text }]}>
                {filteredExercises.length} {selectedMuscle.toUpperCase()} EXERCISES
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ExerciseVisualCard
            exercise={item}
            onPress={() => {
              setActiveHighlightPart(undefined);
              setActiveExerciseModal(item);
            }}
            onQuickAdd={
              activeWorkout
                ? () => addExerciseToActiveWorkout(item.id)
                : undefined
            }
          />
        )}
      />

      {/* Exercise Detail Popup */}
      {activeExerciseModal && (
        <ExerciseDetailModal
          visible={!!activeExerciseModal}
          exercise={activeExerciseModal}
          highlightPart={activeHighlightPart}
          onClose={() => {
            setActiveExerciseModal(null);
            setActiveHighlightPart(undefined);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  clearSearch: {
    fontSize: 14,
    padding: 4,
  },
  filterSection: {
    marginVertical: 12,
  },
  filterTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipList: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  countRow: {
    marginVertical: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  armsBreakdownBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginVertical: 12,
  },
  armsBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  armsEmoji: {
    fontSize: 22,
  },
  armsTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  armsSub: {
    fontSize: 11,
    marginTop: 1,
  },
  armsGrid: {
    gap: 8,
  },
  armPartCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  partDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  partName: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  partTarget: {
    fontSize: 11,
    lineHeight: 15,
  },
  partTagRow: {
    marginTop: 4,
  },
  partTag: {
    fontSize: 11,
    fontWeight: '800',
  },
});
