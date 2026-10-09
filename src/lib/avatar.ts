import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export async function pickAndUploadAvatar(userId: string): Promise<{ url?: string; error?: string }> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: 'Photo library permission is required to set a profile picture.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.length) {
    return {};
  }

  const asset = result.assets[0];

  try {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const contentType = asset.mimeType || blob.type || 'image/jpeg';
    const path = `${userId}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { contentType, upsert: true });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const cacheBustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: cacheBustedUrl })
      .eq('id', userId);

    if (updateError) {
      return { error: updateError.message };
    }

    return { url: cacheBustedUrl };
  } catch (err: any) {
    return { error: err.message || 'Failed to upload photo.' };
  }
}
