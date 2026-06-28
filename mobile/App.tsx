import { NavigationContainer, DarkTheme, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Nunito_600SemiBold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { House, BookOpen, Layers, Languages, BarChart3 } from 'lucide-react-native';
import { colors, font } from './src/theme';
import { HomeScreen, QuizScreen, FlashcardsScreen, VocabScreen, StatsScreen } from './src/screens';

const Tab = createBottomTabNavigator();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_600SemiBold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.muted,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              height: 88,
              paddingTop: 8,
            },
            tabBarLabelStyle: { fontFamily: font.bold, fontSize: 11 },
          }}
        >
          <Tab.Screen name="Αρχική" component={HomeScreen} options={{ tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
          <Tab.Screen name="Κουίζ" component={QuizScreen} options={{ tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }} />
          <Tab.Screen name="Κάρτες" component={FlashcardsScreen} options={{ tabBarIcon: ({ color, size }) => <Layers color={color} size={size} /> }} />
          <Tab.Screen name="Λεξιλόγιο" component={VocabScreen} options={{ tabBarIcon: ({ color, size }) => <Languages color={color} size={size} /> }} />
          <Tab.Screen name="Πρόοδος" component={StatsScreen} options={{ tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} /> }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
