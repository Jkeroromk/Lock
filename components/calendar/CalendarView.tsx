import { View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store/useStore';

interface CalendarViewProps {
  currentMonth: Date;
  markedDates: any;
  selectedDate: string;
  onDayPress: (day: DateData) => void;
  onMonthChange: (month: DateData) => void;
}

export default function CalendarView({
  currentMonth,
  markedDates,
  selectedDate,
  onDayPress,
  onMonthChange,
}: CalendarViewProps) {
  const colors = useTheme();
  const themeMode = useStore((state) => state.themeMode);
  return (
    <View 
      style={{ 
        borderRadius: 24,
        padding: DIMENSIONS.SPACING * 1.2,
        marginBottom: DIMENSIONS.SPACING * 1.2,
        backgroundColor: colors.cardBackground,
        borderWidth: 2,
        borderColor: colors.borderPrimary,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
        overflow: 'hidden',
      }}
    >
      <Calendar
        key={`calendar-${themeMode}`}
        current={currentMonth.toISOString().split('T')[0]}
        onDayPress={onDayPress}
        onMonthChange={onMonthChange}
        markedDates={{
          ...markedDates,
          [selectedDate]: {
            ...markedDates[selectedDate],
            selected: true,
            selectedColor: colors.cardBackgroundSecondary,
          },
        }}
        markingType="multi-dot"
        theme={{
          backgroundColor: colors.cardBackground,
          calendarBackground: colors.cardBackground,
          textSectionTitleColor: colors.textPrimary,
          selectedDayBackgroundColor: colors.cardBackgroundSecondary,
          selectedDayTextColor: colors.textPrimary,
          todayTextColor: colors.textPrimary,
          dayTextColor: colors.textPrimary,
          textDisabledColor: colors.textSecondary,
          dotColor: colors.textPrimary,
          selectedDotColor: colors.textPrimary,
          arrowColor: colors.textPrimary,
          monthTextColor: colors.textPrimary,
          indicatorColor: colors.textPrimary,
          textDayFontWeight: '600',
          textMonthFontWeight: '900',
          textDayHeaderFontWeight: '700',
          textDayFontSize: TYPOGRAPHY.bodyM,
          textMonthFontSize: TYPOGRAPHY.titleM,
          textDayHeaderFontSize: TYPOGRAPHY.bodyXS,
          'stylesheet.calendar.header': {
            week: {
              marginTop: 5,
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingHorizontal: 5,
            },
          },
          'stylesheet.day.basic': {
            today: {
              backgroundColor: colors.cardBackgroundSecondary,
              borderRadius: 8,
            },
            todayText: {
              color: colors.textPrimary,
              fontWeight: '900',
            },
          },
        } as any}
        style={{
          borderRadius: 20,
        }}
      />
    </View>
  );
}

