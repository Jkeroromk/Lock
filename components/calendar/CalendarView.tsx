import { View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

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
  return (
    <View 
      style={{ 
        borderRadius: 24,
        padding: DIMENSIONS.SPACING * 1.2,
        marginBottom: DIMENSIONS.SPACING * 1.2,
        backgroundColor: COLORS.cardBackground,
        borderWidth: 2,
        borderColor: COLORS.borderPrimary,
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
        overflow: 'hidden',
      }}
    >
      <Calendar
        current={currentMonth.toISOString().split('T')[0]}
        onDayPress={onDayPress}
        onMonthChange={onMonthChange}
        markedDates={{
          ...markedDates,
          [selectedDate]: {
            ...markedDates[selectedDate],
            selected: true,
            selectedColor: COLORS.cardBackgroundSecondary,
          },
        }}
        markingType="multi-dot"
        theme={{
          backgroundColor: COLORS.cardBackground,
          calendarBackground: COLORS.cardBackground,
          textSectionTitleColor: COLORS.textPrimary,
          selectedDayBackgroundColor: COLORS.cardBackgroundSecondary,
          selectedDayTextColor: COLORS.textPrimary,
          todayTextColor: COLORS.textPrimary,
          dayTextColor: COLORS.textPrimary,
          textDisabledColor: COLORS.textSecondary,
          dotColor: COLORS.textPrimary,
          selectedDotColor: COLORS.textPrimary,
          arrowColor: COLORS.textPrimary,
          monthTextColor: COLORS.textPrimary,
          indicatorColor: COLORS.textPrimary,
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
              backgroundColor: COLORS.cardBackgroundSecondary,
              borderRadius: 8,
            },
            todayText: {
              color: COLORS.textPrimary,
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

