import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppTheme } from '../theme/appTheme';
import { WeightGoal, Difficulty } from '../types/fitness';

export const OnboardingScreen = ({ onComplete }: { onComplete?: () => void }) => {
  const theme = useAppTheme();
  const { profile, updateProfile, loginGuest } = useFitnessApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name || 'Athlete');
  const [goal, setGoal] = useState<WeightGoal>(profile.fitnessGoal || 'weight_gain');
  const [currentWeight, setCurrentWeight] = useState(profile.currentWeightKg.toString());
  const [targetWeight, setTargetWeight] = useState(profile.targetWeightKg.toString());
  const [height, setHeight] = useState(profile.heightCm.toString());
  const [experience, setExperience] = useState<Difficulty>('intermediate');

  const handleFinish = async () => {
    const curW = parseFloat(currentWeight) || 75;
    const tarW = parseFloat(targetWeight) || 80;
    const h = parseInt(height, 10) || 178;

    // Auto-calculate starting calories & protein based on goal
    let cal = 2600;
    if (goal === 'weight_gain' || goal === 'muscle_gain') cal = 2900;
    if (goal === 'weight_loss') cal = 2100;

    await updateProfile({
      name,
      fitnessGoal: goal,
      startWeightKg: curW,
      currentWeightKg: curW,
      targetWeightKg: tarW,
      heightCm: h,
      experience,
      targetCalories: cal,
      targetProteinGrams: Math.round(curW * 2.2),
    });

    await loginGuest();
    if (onComplete) onComplete();
  };

  const goalsList: { id: WeightGoal; title: string; desc: string; emoji: string }[] = [
    { id: 'weight_gain', title: 'Muscle Gain (Bulk)', desc: 'Build lean muscle mass & maximum strength', emoji: '💪' },
    { id: 'weight_loss', title: 'Fat Loss (Cut)', desc: 'Shed body fat while preserving muscle', emoji: '🔥' },
    { id: 'muscle_gain', title: 'Body Recomposition', desc: 'Simultaneous fat loss and muscle toning', emoji: '⚡' },
    { id: 'maintenance', title: 'Strength & Performance', desc: 'Maintain current weight and boost athletic power', emoji: '🏆' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {step === 0 && (
        <View style={styles.splashStep}>
          <Image
            source={require('../../assets/splash.png')}
            style={styles.splashImage}
            resizeMode="cover"
          />
          <View style={[styles.splashOverlay, { backgroundColor: 'rgba(8, 11, 18, 0.75)' }]}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>⚡</Text>
              <Text style={styles.logoText}>TITANFIT AI</Text>
            </View>

            <Text style={styles.heroTitle}>EVOLVE YOUR PHYSIQUE</Text>
            <Text style={[styles.heroSub, { color: theme.muted }]}>
              Interactive 3D Muscle Anatomy • Weight Transformation • AI Fitness Coach
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              onPress={() => setStep(1)}
            >
              <Text style={styles.primaryBtnText}>GET STARTED ➔</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step > 0 && (
        <ScrollView contentContainerStyle={styles.quizContent}>
          <View style={styles.stepIndicator}>
            <Text style={[styles.stepNum, { color: theme.accent }]}>STEP {step} OF 3</Text>
            <View style={[styles.stepTrack, { backgroundColor: theme.surfaceAlt }]}>
              <View style={[styles.stepFill, { width: `${(step / 3) * 100}%`, backgroundColor: theme.primary }]} />
            </View>
          </View>

          {step === 1 && (
            <View>
              <Text style={[styles.quizTitle, { color: theme.text }]}>What is your primary training goal?</Text>
              <Text style={[styles.quizSub, { color: theme.muted }]}>
                We will calculate your exact daily calorie surplus or deficit.
              </Text>

              <View style={styles.goalsWrap}>
                {goalsList.map((g) => {
                  const isSel = goal === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      activeOpacity={0.8}
                      style={[
                        styles.goalCard,
                        {
                          backgroundColor: isSel ? `${theme.primary}22` : theme.surface,
                          borderColor: isSel ? theme.primary : theme.borderSoft,
                        },
                      ]}
                      onPress={() => setGoal(g.id)}
                    >
                      <Text style={styles.goalCardEmoji}>{g.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.goalCardTitle, { color: theme.text }]}>{g.title}</Text>
                        <Text style={[styles.goalCardDesc, { color: theme.muted }]}>{g.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: theme.primary }]}
                onPress={() => setStep(2)}
              >
                <Text style={styles.nextBtnText}>CONTINUE ➔</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={[styles.quizTitle, { color: theme.text }]}>Your Body Metrics</Text>
              <Text style={[styles.quizSub, { color: theme.muted }]}>
                Used to tailor your weight progress chart and macros.
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Your Name:</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Current Weight (kg):</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
                    keyboardType="numeric"
                    value={currentWeight}
                    onChangeText={setCurrentWeight}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Target Goal (kg):</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.primary }]}
                    keyboardType="numeric"
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Height (cm):</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                />
              </View>

              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: theme.primary }]}
                onPress={() => setStep(3)}
              >
                <Text style={styles.nextBtnText}>CONTINUE ➔</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={[styles.quizTitle, { color: theme.text }]}>Experience Level</Text>
              <Text style={[styles.quizSub, { color: theme.muted }]}>
                Tailors exercise recommendations and intensity.
              </Text>

              {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map((lvl) => {
                const isSel = experience === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.expCard,
                      {
                        backgroundColor: isSel ? `${theme.primary}22` : theme.surface,
                        borderColor: isSel ? theme.primary : theme.borderSoft,
                      },
                    ]}
                    onPress={() => setExperience(lvl)}
                  >
                    <Text style={[styles.expTitle, { color: theme.text }]}>{lvl.toUpperCase()}</Text>
                    <Text style={[styles.expDesc, { color: theme.muted }]}>
                      {lvl === 'beginner'
                        ? '0 - 1 years gym experience • Focus on form & habits'
                        : lvl === 'intermediate'
                        ? '1 - 3 years gym experience • Progressive overload & splits'
                        : '3+ years experience • High volume & advanced hypertrophy'}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.finishBtn, { backgroundColor: theme.primary }]}
                onPress={handleFinish}
              >
                <Text style={styles.finishBtnText}>ENTER TITANFIT AI ⚡</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashStep: {
    flex: 1,
    position: 'relative',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 50,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  logoEmoji: {
    fontSize: 24,
  },
  logoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 28,
  },
  primaryBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  quizContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  stepIndicator: {
    marginBottom: 24,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  stepTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stepFill: {
    height: '100%',
    borderRadius: 3,
  },
  quizTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  quizSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  goalsWrap: {
    gap: 12,
    marginBottom: 24,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  goalCardEmoji: {
    fontSize: 26,
  },
  goalCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  goalCardDesc: {
    fontSize: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  nextBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  expCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  expTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  expDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  finishBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 14,
  },
  finishBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
