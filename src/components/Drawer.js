import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LOCAL_ASSETS } from "../constants/assets";
import { colors, TOP_INSET, BOTTOM_INSET } from "../constants/theme";
import EditableImage from "./EditableImage";

export default function Drawer({
  visible,
  onClose,
  activeTab,
  onSelectTab,
  tabs,
  userProfile,
  onSignOut,
}) {
  const translateX = useRef(new Animated.Value(-320)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      translateX.setValue(-320);
      backdropOpacity.setValue(0);
      setModalVisible(true);
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -320, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  function handleShow() {
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onShow={handleShow}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)", opacity: backdropOpacity }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>

        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          {/* Winnie brand header with tap-to-replace avatar */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <EditableImage
              imageKey="avatar_winnie"
              defaultSource={LOCAL_ASSETS.winnie}
              style={styles.drawerAvatar}
            />
            <View>
              <Text style={styles.drawerBrand}>Winnie 🐾</Text>
              <Text style={{ color: colors.textFaint, fontSize: 11 }}>Tap icon to replace 🖼️</Text>
            </View>
          </View>

          {/* Nav tabs */}
          <View style={{ marginTop: 28, gap: 6 }}>
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => {
                    onSelectTab(t.key);
                    onClose();
                  }}
                  style={[styles.drawerItem, active && { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dot, { backgroundColor: active ? t.accent : "transparent", borderColor: t.accent }]} />
                  <Text style={[styles.drawerItemText, active && { color: colors.text, fontWeight: "600" }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* User profile + sign out */}
          {userProfile && (
            <View style={{ marginTop: "auto", marginBottom: BOTTOM_INSET + 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 6, marginBottom: 12 }}>
                <View style={[styles.drawerAvatarPlaceholder, { backgroundColor: colors.surfaceHighlight }]}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
                    {(userProfile.name || userProfile.email || "W")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
                    {userProfile.name || "Explorer"}
                  </Text>
                  <Text style={{ color: colors.textFaint, fontSize: 11 }} numberOfLines={1}>
                    {userProfile.email || ""}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  if (onSignOut) onSignOut();
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "rgba(239, 68, 68, 0.12)" }}
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.negative, fontSize: 13, fontWeight: "700" }}>Sign Out 🚪</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.surfaceRaised,
    paddingTop: TOP_INSET + 20,
    paddingHorizontal: 20,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  drawerAvatar: { width: 40, height: 40, borderRadius: 20 },
  drawerBrand: { color: colors.text, fontSize: 20, fontWeight: "800" },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
  },
  drawerItemText: { color: colors.textMuted, fontSize: 15 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  drawerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
