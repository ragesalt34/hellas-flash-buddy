import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, space } from '../theme';

// Starter placeholder screens. Real UI (ported from the Mini App with native
// components + Reanimated) gets built here next, one screen at a time.
function Screen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
      </View>
    </SafeAreaView>
  );
}

export const HomeScreen = () => <Screen title="Hellas Study" subtitle="Αρχική — σύντομα" />;
export const QuizScreen = () => <Screen title="Κουίζ" subtitle="Σύντομα" />;
export const FlashcardsScreen = () => <Screen title="Κάρτες" subtitle="Σύντομα" />;
export const VocabScreen = () => <Screen title="Λεξιλόγιο" subtitle="Σύντομα" />;
export const StatsScreen = () => <Screen title="Πρόοδος" subtitle="Σύντομα" />;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  title: { color: colors.accent, fontFamily: font.black, fontSize: 30, letterSpacing: -0.5 },
  sub: { color: colors.muted, fontFamily: font.regular, fontSize: 15 },
});
