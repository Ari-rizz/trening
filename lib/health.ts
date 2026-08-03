'use client';

import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

type HealthDataType = 'calories' | 'totalCalories' | 'activeEnergyBurned';
type WorkoutType = 'strengthTraining' | 'traditionalStrengthTraining' | 'functionalStrengthTraining' | 'running' | 'cycling' | 'walking' | 'swimming' | 'rowing' | 'elliptical' | 'other';

const READ_TYPES: HealthDataType[] = ['totalCalories', 'activeEnergyBurned', 'calories'];
const WRITE_TYPES: HealthDataType[] = ['calories'];

export interface HealthAvailability {
  available: boolean;
  platform: string;
}

export async function isHealthAvailable(): Promise<HealthAvailability> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, platform: 'web' };
  }
  try {
    const { Health } = await import('@capgo/capacitor-health');
    const result = await Health.isAvailable();
    return { available: result.available, platform: result.platform ?? Capacitor.getPlatform() };
  } catch {
    return { available: false, platform: Capacitor.getPlatform() };
  }
}

export async function requestHealthAuthorization(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { Health } = await import('@capgo/capacitor-health');
    await Health.requestAuthorization({
      read: READ_TYPES,
      write: WRITE_TYPES,
      requestHistoryAccess: true,
    } as any);
    return true;
  } catch {
    return false;
  }
}

export async function checkHealthAuthorization(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { Health } = await import('@capgo/capacitor-health');
    const status = await Health.checkAuthorization({
      read: READ_TYPES,
      write: WRITE_TYPES,
    } as any);
    return status.readAuthorized.length > 0;
  } catch {
    return false;
  }
}

export interface DailyCalorieData {
  date: string;
  calories: number;
}

export async function readCaloriesForDay(date: Date): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;
  try {
    const { Health } = await import('@capgo/capacitor-health');
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    // Try totalCalories first (active + basal)
    let value = await queryCalories(Health, 'totalCalories', start, end);
    // Fallback to calories if totalCalories returned 0
    if (value === 0) {
      value = await queryCalories(Health, 'calories', start, end);
    }
    return value;
  } catch {
    return 0;
  }
}

async function queryCalories(Health: any, dataType: string, start: Date, end: Date): Promise<number> {
  try {
    const result = await Health.queryAggregated({
      dataType: dataType as any,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      bucket: 'day',
      aggregation: 'sum',
    } as any);
    if (result.samples && result.samples.length > 0) {
      return Math.round(result.samples[0].value);
    }
  } catch {
    // dataType not available
  }
  return 0;
}

export async function readCaloriesForDateRange(startDate: Date, endDate: Date): Promise<DailyCalorieData[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const { Health } = await import('@capgo/capacitor-health');
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Try totalCalories first
    let samples = await queryCaloriesRange(Health, 'totalCalories', start, end);
    // Fallback to calories if empty
    if (samples.length === 0) {
      samples = await queryCaloriesRange(Health, 'calories', start, end);
    }
    return samples;
  } catch {
    return [];
  }
}

async function queryCaloriesRange(Health: any, dataType: string, start: Date, end: Date): Promise<DailyCalorieData[]> {
  try {
    const result = await Health.queryAggregated({
      dataType: dataType as any,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      bucket: 'day',
      aggregation: 'sum',
    } as any);
    return (result.samples || []).map((s: any) => ({
      date: s.startDate.split('T')[0],
      calories: Math.round(s.value),
    }));
  } catch {
    return [];
  }
}

export async function writeWorkoutToHealth(
  workoutType: WorkoutType,
  startDate: Date,
  endDate: Date,
  calories: number
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Health } = await import('@capgo/capacitor-health');
    if (calories > 0) {
      await Health.saveSample({
        dataType: 'calories' as any,
        value: calories,
        unit: 'kilocalorie' as any,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      } as any);
    }
  } catch {
    // Silently fail - health write is best-effort
  }
}

export async function syncCaloriesToDatabase(userId: string, days = 365): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyData = await readCaloriesForDateRange(startDate, endDate);

    if (dailyData.length === 0) return;

    const rows = dailyData.map(d => ({
      user_id: userId,
      date: d.date,
      calories: d.calories,
      source: 'health_app',
      synced_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('daily_calorie_logs')
      .upsert(rows, { onConflict: 'user_id,date' });

    if (error) console.error('Failed to sync calorie data', error);
  } catch {
    // Best-effort sync
  }
}

export async function getTodayCaloriesFromDB(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_calorie_logs')
    .select('calories')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (error || !data) return 0;
  return data.calories || 0;
}

export async function getCalorieHistoryFromDB(userId: string, days = 365): Promise<DailyCalorieData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('daily_calorie_logs')
    .select('date, calories')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error || !data) return [];
  return data.map(d => ({ date: d.date, calories: d.calories || 0 }));
}

export async function saveHealthConnection(userId: string, provider: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      health_connected: true,
      health_provider: provider,
    })
    .eq('id', userId);
}

export async function removeHealthConnection(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      health_connected: false,
      health_provider: null,
    })
    .eq('id', userId);
}

export async function getHealthConnection(userId: string): Promise<{ connected: boolean; provider: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('health_connected, health_provider')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return { connected: false, provider: null };
  return { connected: data.health_connected || false, provider: data.health_provider };
}

export async function connectHealthApp(userId: string): Promise<{ success: boolean; error?: string }> {
  const availability = await isHealthAvailable();
  if (!availability.available) {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      return { success: false, error: 'health_connect_not_installed' };
    }
    return { success: false, error: 'health_not_available' };
  }

  const granted = await requestHealthAuthorization();
  if (!granted) {
    return { success: false, error: 'permission_denied' };
  }

  const provider = Capacitor.getPlatform() === 'ios' ? 'apple_health' : 'health_connect';
  await saveHealthConnection(userId, provider);

  await syncCaloriesToDatabase(userId);

  return { success: true };
}
