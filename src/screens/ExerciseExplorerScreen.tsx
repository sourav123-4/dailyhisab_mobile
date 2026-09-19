import React, { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppMode } from '../navigation/AppModeContext';
import { useAppTheme } from '../theme/appTheme';
import { MuscleGroup, Equipment, Exercise } from '../types/fitness';
import { MuscleAnatomyViewer } from '../components/MuscleAnatomyViewer';
import { ExerciseVisualCard } from '../components/ExerciseVisualCard';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { ALL_MUSCLE_PARTS_BREAKDOWN } from '../data/exercisesData';

const muscleCategories: { id: MuscleGroup; label: string; emoji: string }[] = [
  { id: 'chest', label: 'Chest', emoji: '🏋️' },
  { id: 'back', label: 'Back', emoji: '🦅' },
  { id: 'arms', label: 'Arms', emoji: '💪' },
  { id: 'shoulders', label: 'Shoulders', emoji: '🥥' },
  { id: 'legs', label: 'Legs', emoji: '🦵' },
  { id: 'abs', label: 'Core', emoji: '⚡' },
  { id: 'fullbody', label: 'Full Body', emoji: '🌐' },
];

export const ExerciseExplorerScreen = () => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { setAppMode } = useAppMode();
  const { exercises, addExerciseToActiveWorkout, activeWorkout } = useFitnessApp();

  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>('chest');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeExerciseModal, setActiveExerciseModal] = useState<Exercise | null>(null);
  const [activeHighlightPart, setActiveHighlightPart] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const currentBreakdownParts = ALL_MUSCLE_PARTS_BREAKDOWN[selectedMuscle] || [];
  const currentCategory = muscleCategories.find((c) => c.id === selectedMuscle) || muscleCategories[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Two-Tier Dashboard Header */}
      <View style={[styles.header, { borderBottomColor: theme.borderSoft, paddingTop: Math.max(insets.top, 14) }]}>
        {/* Tier 1: Brand & Top Actions */}
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <View style={[styles.pulseDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.brandTitle, { color: theme.text }]}>TITANFIT</Text>
            <View style={[styles.proBadge, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.proBadgeText, { color: theme.primary }]}>PRO</Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modeSwitchBtn, { backgroundColor: 'rgba(20, 184, 166, 0.15)', borderColor: '#14B8A6' }]}
              onPress={() => setAppMode('hisab')}
            >
              <Text style={{ fontSize: 13 }}>💰</Text>
              <Text style={{ color: '#14B8A6', fontWeight: '800', fontSize: 11.5 }}>Daily Hisab</Text>
            </TouchableOpacity>

            <View style={[styles.badgePill, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
              <Text style={[styles.badgePillText, { color: theme.primary }]}>
                {filteredExercises.length} Drills
              </Text>
            </View>
          </View>
        </View>

        {/* Tier 2: Subtitle & Title */}
        <View style={styles.headerBottomRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greetingText, { color: theme.muted }]}>3D MUSCULOSKELETAL ATLAS</Text>
            <Text style={[styles.mainHeading, { color: theme.text }]}>Anatomy & Biomechanics</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
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

            {/* Muscle Group Horizontal Selector Tabs */}
            <View style={styles.muscleTabsSection}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={muscleCategories}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.muscleTabsList}
                renderItem={({ item }) => {
                  const isSelected = selectedMuscle === item.id;
                  const countForMuscle =
                    item.id === 'fullbody'
                      ? exercises.length
                      : exercises.filter((e) => e.muscleGroup === item.id).length;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      style={[
                        styles.muscleTabCard,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.surface,
                          borderColor: isSelected ? theme.primary : theme.borderSoft,
                        },
                      ]}
                      onPress={() => setSelectedMuscle(item.id)}
                    >
                      <Text style={styles.muscleTabEmoji}>{item.emoji}</Text>
                      <Text
                        style={[
                          styles.muscleTabLabel,
                          {
                            color: isSelected ? '#FFFFFF' : theme.text,
                            fontWeight: isSelected ? '900' : '600',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <View
                        style={[
                          styles.muscleCountBadge,
                          {
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : theme.surfaceAlt,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.muscleCountText,
                            { color: isSelected ? '#FFFFFF' : theme.muted },
                          ]}
                        >
                          {countForMuscle}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
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

            {/* ANATOMICAL REGIONAL BREAKDOWN FOR SELECTED MUSCLE */}
            {currentBreakdownParts.length > 0 && (
              <View style={[styles.breakdownBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownEmoji}>{currentCategory.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.breakdownTitle, { color: theme.text }]}>
                      {currentCategory.label.toUpperCase()} - ANATOMICAL REGIONS
                    </Text>
                    <Text style={[styles.breakdownSub, { color: theme.muted }]}>
                      Tap any muscle head to launch 3D human biomechanical execution
                    </Text>
                  </View>
                </View>

                <View style={styles.partsGrid}>
                  {currentBreakdownParts.map((part) => (
                    <TouchableOpacity
                      key={part.id}
                      activeOpacity={0.75}
                      style={[styles.partCard, { backgroundColor: theme.surface, borderColor: `${part.color}55` }]}
                      onPress={() => {
                        const matchedEx =
                          exercises.find((e) => e.id === part.primaryExerciseId) ||
                          exercises.find((e) =>
                            part.exercises.some((targetName) =>
                              e.name.toLowerCase().includes(targetName.toLowerCase())
                            )
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
                          <Text style={[styles.partTag, { color: part.color }]}>⚡ 3D Human Execution ➔</Text>
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
                {filteredExercises.length} {selectedMuscle.toUpperCase()} EXERCISES AVAILABLE
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  mainHeading: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
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
    marginBottom: 12,
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
  muscleTabsSection: {
    marginBottom: 14,
  },
  muscleTabsList: {
    gap: 8,
  },
  muscleTabCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  muscleTabEmoji: {
    fontSize: 15,
  },
  muscleTabLabel: {
    fontSize: 12.5,
  },
  muscleCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  muscleCountText: {
    fontSize: 10,
    fontWeight: '800',
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
  breakdownBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginVertical: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  breakdownEmoji: {
    fontSize: 22,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  breakdownSub: {
    fontSize: 11,
    marginTop: 1,
  },
  partsGrid: {
    gap: 8,
  },
  partCard: {
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
