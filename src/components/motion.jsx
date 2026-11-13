// Ümumi animasiya qurğuları (react-native Animated: web + telefon). Native driver yalnız telefonda.
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Platform, View } from 'react-native';

export const ND = Platform.OS !== 'web';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Görünəndə: solğunluqdan çıxır + istiqamətdən süzülür (from: bottom | left | right | scale | none). */
export function FadeIn({ children, delay = 0, from = 'bottom', distance = 14, duration = 340, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const lerp = (a, b) => v.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const transform = from === 'bottom' ? [{ translateY: lerp(distance, 0) }]
    : from === 'left' ? [{ translateX: lerp(-distance, 0) }]
    : from === 'right' ? [{ translateX: lerp(distance, 0) }]
    : from === 'scale' ? [{ scale: lerp(0.9, 1) }] : [];
  return <Animated.View style={[{ opacity: v, transform }, style]}>{children}</Animated.View>;
}

/** Yaylanmalı açılış: popup/pəncərə üçün (origin: transformOrigin, məs. 'bottom left'). */
export function SpringIn({ children, origin = 'center', style, from = 0.82 }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(v, { toValue: 1, friction: 7, tension: 140, useNativeDriver: ND }).start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[{ opacity: v.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: 'clamp' }), transformOrigin: origin, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

/** Pəncərə arxa fonu: yumşaq qaralma. */
export function Backdrop({ children, style, onPress }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 220, useNativeDriver: ND }).start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AnimatedPressable onPress={onPress} style={[{ flex: 1, backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)'] }) }, style]}>
      {children}
    </AnimatedPressable>
  );
}

/** Basanda yumşaq kiçilir, buraxanda yaylanır. style obyekt/massiv olmalıdır (funksiya yox). */
export function PressableScale({ children, style, scaleTo = 0.95, onPressIn, onPressOut, ...rest }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (value) => Animated.spring(s, { toValue: value, speed: 50, bounciness: 8, useNativeDriver: ND }).start();
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => { to(scaleTo); onPressIn?.(e); }}
      onPressOut={(e) => { to(1); onPressOut?.(e); }}
      style={[style, { transform: [{ scale: s }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** value dəyişəndə qısa "pop" (nişan sayı və s.). */
export function Pop({ value, children, style }) {
  const s = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    Animated.sequence([
      Animated.timing(s, { toValue: 1.35, duration: 110, useNativeDriver: ND }),
      Animated.spring(s, { toValue: 1, friction: 4, tension: 200, useNativeDriver: ND }),
    ]).start();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={[{ transform: [{ scale: s }] }, style]}>{children}</Animated.View>;
}

/** Element görünəndə yaylanaraq böyüyür (düymənin növü dəyişəndə). */
export function PopIn({ children, style }) {
  const s = useRef(new Animated.Value(0.4)).current;
  useEffect(() => { Animated.spring(s, { toValue: 1, friction: 5, tension: 220, useNativeDriver: ND }).start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={[{ opacity: s.interpolate({ inputRange: [0.4, 0.8], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: s }] }, style]}>{children}</Animated.View>;
}

/** Yazı zamanı mikrofon ətrafında yayılan halqa. */
export function PulseRing({ size, color = '#DC2626' }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: ND }));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }] }} />
  );
}

/** Sonsuz yumşaq yuxarı-aşağı (boş ekran illüstrasiyaları). */
export function Float({ children, amount = 6, duration = 1800, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  return <Animated.View style={[{ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amount] }) }] }, style]}>{children}</Animated.View>;
}

/** Yanıb-sönən nöqtə (yazı göstəricisi). */
export function Blink({ children, style }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 0.2, duration: 600, useNativeDriver: ND }),
      Animated.timing(v, { toValue: 1, duration: 600, useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[{ opacity: v }, style]}>{children}</Animated.View>;
}

/** "yazır…" üçün tullanan üç nöqtə. */
export function TypingDots({ color = '#15A34A', size = 5 }) {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = dots.map((d, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 140),
      Animated.timing(d, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.timing(d, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
      Animated.delay(420 - i * 140),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 3, height: size * 2 }}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 1.2] }) }], opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }} />
      ))}
    </View>
  );
}

/** + ↔ × : dönərək bir-birinə çevrilən iki ikon (open true → ×). */
export function PlusMorph({ open, plus, cross }) {
  const v = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => { Animated.spring(v, { toValue: open ? 1 : 0, friction: 6, tension: 160, useNativeDriver: ND }).start(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const rot = (a, b) => v.interpolate({ inputRange: [0, 1], outputRange: [`${a}deg`, `${b}deg`] });
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', opacity: v.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ rotate: rot(0, 135) }] }}>{plus}</Animated.View>
      <Animated.View style={{ position: 'absolute', opacity: v.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ rotate: rot(-135, 0) }] }}>{cross}</Animated.View>
    </View>
  );
}
