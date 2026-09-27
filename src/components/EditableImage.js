import React, { useState, useEffect } from "react";
import {
  Image,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  View,
  Modal,
  Text,
  Pressable,
  Share,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  getCustomImages,
  saveCustomImage,
  removeCustomImage,
  subscribeCustomImages,
} from "../services/customAssets";
import { colors, cardShadow } from "../constants/theme";

/**
 * Universal EditableImage component
 * Tapping shows a custom, themed dialog with:
 * 1. Download image
 * 2. Replace image
 * Top-right cross button and tap-outside backdrop dismiss.
 */
export default function EditableImage({
  imageKey,
  defaultSource,
  style,
  resizeMode = "cover",
  containerStyle,
  disabled = false,
}) {
  const [customUri, setCustomUri] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getCustomImages().then((imgs) => {
      if (isMounted && imgs[imageKey]) {
        setCustomUri(imgs[imageKey]);
      }
    });

    const unsubscribe = subscribeCustomImages((imgs) => {
      if (isMounted) {
        setCustomUri(imgs[imageKey] || null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [imageKey]);

  function handlePress() {
    if (disabled) return;
    setModalVisible(true);
  }

  // ── 1. DOWNLOAD / SAVE IMAGE TO DEVICE ──
  async function handleDownload() {
    try {
      setDownloading(true);
      let sourceUri = customUri;
      if (!sourceUri && defaultSource) {
        const resolved = Image.resolveAssetSource(defaultSource);
        sourceUri = resolved?.uri;
      }

      if (!sourceUri) {
        Alert.alert("Error", "Could not resolve image source to download.");
        return;
      }

      // Use built-in React Native Share API (supported everywhere in Expo Go without native modules)
      await Share.share({
        url: sourceUri,
        title: "Save or Share Image",
        message: sourceUri,
      });
      setModalVisible(false);
    } catch (err) {
      console.log("[EditableImage] Download/Share error:", err);
    } finally {
      setDownloading(false);
    }
  }

  // ── 2. REPLACE IMAGE FROM GALLERY ──
  async function handleReplace() {
    try {
      setReplacing(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to upload your custom image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        await saveCustomImage(imageKey, result.assets[0].uri);
        setModalVisible(false);
      }
    } catch (err) {
      console.log("[EditableImage] Replace error:", err);
      Alert.alert("Error", "Could not pick image. Please try again.");
    } finally {
      setReplacing(false);
    }
  }

  // ── RESET TO DEFAULT (IF REPLACED) ──
  async function handleReset() {
    await removeCustomImage(imageKey);
    setModalVisible(false);
  }

  const activeSource = customUri ? { uri: customUri } : defaultSource;

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={disabled}
        style={[styles.container, containerStyle]}
      >
        <Image
          source={activeSource}
          style={style}
          resizeMode={resizeMode}
        />
      </TouchableOpacity>

      {/* CUSTOM THEMED DIALOG MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        {/* Backdrop: tap anywhere outside to dismiss */}
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          {/* Prevent tap inside card from dismissing */}
          <Pressable style={[styles.dialogCard, cardShadow]} onPress={(e) => e.stopPropagation()}>
            {/* Header with Title and Cross Button */}
            <View style={styles.dialogHeader}>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.dialogTitle}>Image Options 🖼️</Text>
                <Text style={styles.dialogSub}>Choose an action for this picture</Text>
              </View>

              {/* Cross button on top right */}
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Current Image Preview */}
            <View style={styles.previewBox}>
              <Image source={activeSource} style={styles.previewImage} resizeMode="cover" />
            </View>

            {/* 2 MAIN OPTIONS */}
            <View style={styles.buttonsGroup}>
              {/* Option 1: Download / Save Image */}
              <TouchableOpacity
                style={styles.primaryOptionBtn}
                onPress={handleDownload}
                disabled={downloading || replacing}
                activeOpacity={0.8}
              >
                <Text style={styles.optionIcon}>📥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Download Image</Text>
                  <Text style={styles.optionDesc}>Save or export this picture</Text>
                </View>
                {downloading && <ActivityIndicator color="#FFF" size="small" />}
              </TouchableOpacity>

              {/* Option 2: Replace Image */}
              <TouchableOpacity
                style={[styles.primaryOptionBtn, styles.replaceOptionBtn]}
                onPress={handleReplace}
                disabled={downloading || replacing}
                activeOpacity={0.8}
              >
                <Text style={styles.optionIcon}>📸</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Replace Image</Text>
                  <Text style={styles.optionDesc}>Upload a photo from your gallery</Text>
                </View>
                {replacing && <ActivityIndicator color="#FFF" size="small" />}
              </TouchableOpacity>

              {/* Reset to Default (only if custom image is active) */}
              {customUri && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resetBtnText}>🔄 Reset to Default Artwork</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  dialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  dialogTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  dialogSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  previewBox: {
    width: "100%",
    height: 120,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  buttonsGroup: {
    gap: 10,
  },
  primaryOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  replaceOptionBtn: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.streakOrange,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  optionDesc: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 1,
  },
  resetBtn: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 4,
  },
  resetBtnText: {
    color: colors.negative,
    fontSize: 12,
    fontWeight: "600",
  },
});
