import AsyncStorage from "@react-native-async-storage/async-storage";

const CUSTOM_IMAGES_KEY = "@winnie_custom_images";

// Get all custom images as { [sectionKey]: uri }
export async function getCustomImages() {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_IMAGES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Save a custom image URI for a section key
export async function saveCustomImage(sectionKey, uri) {
  try {
    const existing = await getCustomImages();
    const updated = { ...existing, [sectionKey]: uri };
    await AsyncStorage.setItem(CUSTOM_IMAGES_KEY, JSON.stringify(updated));
    notifySubscribers(updated);
  } catch (e) {
    console.log("[CustomAssets] Error saving custom image:", e);
  }
}

// Remove a custom image override for a section key (reset to default)
export async function removeCustomImage(sectionKey) {
  try {
    const existing = await getCustomImages();
    const updated = { ...existing };
    delete updated[sectionKey];
    await AsyncStorage.setItem(CUSTOM_IMAGES_KEY, JSON.stringify(updated));
    notifySubscribers(updated);
  } catch (e) {
    console.log("[CustomAssets] Error removing custom image:", e);
  }
}

// Simple pub/sub for reactivity
const subscribers = new Set();
function notifySubscribers(images) {
  subscribers.forEach((fn) => fn(images));
}

export function subscribeCustomImages(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}
