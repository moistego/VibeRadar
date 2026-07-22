import React, {useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch} from '@/state/store';
import {setOnboarded} from '@/state/slices/userSlice';
import {colors, typography, spacing} from '@/presentation/theme';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface Slide {
  id: string;
  headline: string;
  subtitle: string;
  emoji: string;
  buttonText: string;
}

const slides: Slide[] = [
  {
    id: '1',
    headline: 'Never lose your crew',
    emoji: '📍',
    subtitle: 'VibeRadar works offline — no signal? No problem.',
    buttonText: 'Next',
  },
  {
    id: '2',
    headline: 'Invite your squad',
    emoji: '📱',
    subtitle: 'Share your squad code. Everyone scans. You\'re connected.',
    buttonText: 'Next',
  },
  {
    id: '3',
    headline: 'Follow the arrow',
    emoji: '🧭',
    subtitle: 'Big arrow. Clear distance. Zero confusion.',
    buttonText: 'Start Vibing 🎵',
  },
];

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setCurrentIndex(index);
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({index: currentIndex + 1, animated: true});
    } else {
      dispatch(setOnboarded());
      navigation.replace('Pairing');
    }
  }, [currentIndex, dispatch, navigation]);

  const handleSkip = useCallback(() => {
    dispatch(setOnboarded());
    navigation.replace('Pairing');
  }, [dispatch, navigation]);

  const renderSlide = ({item}: {item: Slide}) => (
    <View style={styles.slide}>
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={styles.headline}>{item.headline}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <View style={styles.skipContainer}>
        <Text style={styles.skipText} onPress={handleSkip}>
          Skip
        </Text>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Dot indicators */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.activeDot,
            ]}
          />
        ))}
      </View>

      {/* Action button */}
      <View style={styles.buttonContainer}>
        <View style={styles.button} onTouchEnd={handleNext}>
          <Text style={styles.buttonText}>
            {isLastSlide ? 'Start Vibing 🎵' : 'Next'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  skipText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  emojiContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: {
    fontSize: 80,
  },
  headline: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  activeDot: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  buttonContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '700',
    fontSize: 18,
  },
});
