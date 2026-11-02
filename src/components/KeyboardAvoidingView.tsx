import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  KeyboardEvent,
  Platform,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Android reports the navigation bar as a "keyboard" in edge-to-edge windows; real keyboards are
// far taller than this.
const MIN_KEYBOARD_HEIGHT = 120;

/**
 * Drop-in KeyboardAvoidingView. iOS uses React Native's own. On Android (edge-to-edge, where the
 * window never resizes) it measures where this view ends on screen and pads it so its content
 * sits just above the keyboard, ignoring the navigation-bar "keyboard" Android reports.
 */
export function KeyboardAvoidingView(props: KeyboardAvoidingViewProps) {
  if (Platform.OS === 'ios') return <RNKeyboardAvoidingView {...props} />;
  return <AndroidKeyboardAvoidingView {...props} />;
}

function AndroidKeyboardAvoidingView({
  style,
  children,
  enabled = true,
  keyboardVerticalOffset = 0,
  onLayout,
  behavior: _behavior,
  contentContainerStyle: _contentContainerStyle,
  ...rest
}: KeyboardAvoidingViewProps) {
  const viewRef = useRef<View>(null);
  const keyboardTopRef = useRef<number | null>(null);
  const navBarHeight = useSafeAreaInsets().bottom;
  const navBarHeightRef = useRef(navBarHeight);
  useEffect(() => {
    navBarHeightRef.current = navBarHeight;
  }, [navBarHeight]);
  const [padding, setPadding] = useState(0);

  const update = useCallback(() => {
    const keyboardTop = keyboardTopRef.current;
    if (keyboardTop === null || !enabled) {
      setPadding(0);
      return;
    }
    viewRef.current?.measureInWindow((_x, y, _w, height) => {
      // The padding is inside this view, so its frame (and bottom edge) does not move.
      const overlap = y + height - (keyboardTop - keyboardVerticalOffset);
      setPadding(Math.max(0, Math.round(overlap)));
    });
  }, [enabled, keyboardVerticalOffset]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event: KeyboardEvent) => {
      // React Native reports the keyboard height excluding the system navigation bar; in an
      // edge-to-edge window the keyboard's top edge is that height plus the bar above the bottom.
      const { height } = event.endCoordinates;
      if (height < MIN_KEYBOARD_HEIGHT) {
        keyboardTopRef.current = null;
      } else {
        const screenHeight = Dimensions.get('screen').height;
        keyboardTopRef.current = screenHeight - height - navBarHeightRef.current;
      }
      update();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTopRef.current = null;
      update();
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [update]);

  return (
    <View
      ref={viewRef}
      style={[style, padding > 0 ? { paddingBottom: padding } : null]}
      onLayout={event => {
        onLayout?.(event);
        // Re-measure if the view moves while the keyboard is up (e.g. a tab bar hides).
        if (keyboardTopRef.current !== null) update();
      }}
      {...rest}
    >
      {children}
    </View>
  );
}
