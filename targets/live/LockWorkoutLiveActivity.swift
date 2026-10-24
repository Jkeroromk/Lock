import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// Lock B×C palette.
private let ink = Color(red: 0x0A / 255, green: 0x0A / 255, blue: 0x0A / 255)
private let paper = Color(red: 0xF2 / 255, green: 0xF1 / 255, blue: 0xEC / 255)
private let accent = Color(red: 0xFF / 255, green: 0xD4 / 255, blue: 0x3B / 255)

private typealias Context = ActivityViewContext<LockWorkoutAttributes>

private extension LockWorkoutAttributes {
  func t(_ key: String, _ fallback: String) -> String {
    if let v = labels[key], !v.isEmpty { return v }
    return fallback
  }
}

private extension Context {
  var resting: Bool {
    guard let end = state.restEnd, state.restStart != nil, !isStale else { return false }
    return end > Date()
  }

  var restRange: ClosedRange<Date> {
    let end = state.restEnd ?? Date()
    let start = min(state.restStart ?? end, end)
    return start...end
  }

  var setLabel: String {
    guard state.setIndex > 0 else { return attributes.t("allDone", "All sets done") }
    return attributes.t("setOf", "Set {i}/{n}")
      .replacingOccurrences(of: "{i}", with: "\(state.setIndex)")
      .replacingOccurrences(of: "{n}", with: "\(state.setCount)")
  }

  var progressLabel: String {
    attributes.t("progress", "{done}/{total} sets")
      .replacingOccurrences(of: "{done}", with: "\(state.done)")
      .replacingOccurrences(of: "{total}", with: "\(state.total)")
  }

  /// "60 kg × 8", "× 12" (bodyweight), or "" when nothing's left.
  var load: String {
    guard state.setIndex > 0 else { return "" }
    let reps = state.reps > 0 ? "× \(state.reps)" : "× —"
    return state.weight.isEmpty ? reps : "\(state.weight) \(attributes.unit) \(reps)"
  }

  var link: URL? { URL(string: "lock://workout/session") }
}

struct LockWorkoutLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LockWorkoutAttributes.self) { context in
      FamilyRouter(context: context)
        .activityBackgroundTint(ink)
        .activitySystemActionForegroundColor(paper)
        .widgetURL(context.link)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 2) {
            Text(context.state.exercise)
              .font(.system(size: 16, weight: .heavy))
              .foregroundStyle(paper)
              .lineLimit(1)
            Text(context.setLabel)
              .font(.system(size: 12, weight: .semibold, design: .monospaced))
              .foregroundStyle(paper.opacity(0.6))
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(context.load)
            .font(.system(size: 18, weight: .bold, design: .monospaced))
            .foregroundStyle(accent)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          ActionRow(context: context, compact: true)
            .padding(.top, 4)
        }
      } compactLeading: {
        Image(systemName: "dumbbell.fill")
          .foregroundStyle(accent)
      } compactTrailing: {
        if context.resting {
          Text(timerInterval: context.restRange, countsDown: true)
            .font(.system(size: 14, weight: .semibold, design: .monospaced))
            .monospacedDigit()
            .foregroundStyle(accent)
            .frame(maxWidth: 46)
        } else if context.state.setIndex > 0 {
          Text("\(context.state.setIndex)/\(context.state.setCount)")
            .font(.system(size: 14, weight: .semibold, design: .monospaced))
            .foregroundStyle(paper)
        } else {
          Image(systemName: "checkmark")
            .foregroundStyle(accent)
        }
      } minimal: {
        if context.resting {
          Text(timerInterval: context.restRange, countsDown: true)
            .font(.system(size: 12, weight: .semibold, design: .monospaced))
            .monospacedDigit()
            .foregroundStyle(accent)
        } else {
          Image(systemName: "dumbbell.fill")
            .foregroundStyle(accent)
        }
      }
      .widgetURL(context.link)
      .keylineTint(accent)
    }
    .supplementalActivityFamilies([.small])
  }
}

/// Lock Screen / banner (medium) vs. Apple Watch Smart Stack and CarPlay (small).
private struct FamilyRouter: View {
  let context: Context
  @Environment(\.activityFamily) private var family

  var body: some View {
    switch family {
    case .small:
      SmallView(context: context)
    default:
      LockScreenView(context: context)
    }
  }
}

private struct LockScreenView: View {
  let context: Context

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(alignment: .top, spacing: 12) {
        VStack(alignment: .leading, spacing: 3) {
          Text(context.state.exercise)
            .font(.system(size: 18, weight: .heavy))
            .foregroundStyle(paper)
            .lineLimit(1)
          Text("\(context.setLabel) · \(context.progressLabel)")
            .font(.system(size: 12, weight: .semibold, design: .monospaced))
            .foregroundStyle(paper.opacity(0.6))
            .lineLimit(1)
        }
        Spacer(minLength: 4)
        Text(context.load)
          .font(.system(size: 22, weight: .bold, design: .monospaced))
          .foregroundStyle(accent)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
      }
      ActionRow(context: context, compact: false)
    }
    .padding(16)
  }
}

/// Buttons: "Complete set" while training; the rest countdown with +15 / Skip while resting.
private struct ActionRow: View {
  let context: Context
  let compact: Bool

  var body: some View {
    let a = context.attributes
    if context.state.finishing || context.state.allDone {
      HStack(spacing: 8) {
        Image(systemName: "flag.checkered")
        Text(context.state.finishing ? a.t("openToSave", "Open Lock to save") : a.t("allDone", "All sets done"))
          .lineLimit(1)
      }
      .font(.system(size: 15, weight: .bold))
      .foregroundStyle(ink)
      .frame(maxWidth: .infinity, minHeight: compact ? 40 : 46)
      .background(accent, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    } else if context.resting {
      VStack(spacing: 8) {
        HStack(alignment: .center, spacing: 8) {
          VStack(alignment: .leading, spacing: 0) {
            Text(a.t("rest", "Rest").uppercased())
              .font(.system(size: 10, weight: .bold, design: .monospaced))
              .foregroundStyle(paper.opacity(0.6))
            Text(timerInterval: context.restRange, countsDown: true)
              .font(.system(size: compact ? 24 : 30, weight: .bold, design: .monospaced))
              .monospacedDigit()
              .foregroundStyle(accent)
          }
          Spacer(minLength: 4)
          Button(intent: AddRestIntent(workoutId: a.workoutId, seconds: 15)) {
            Text("+15")
              .font(.system(size: 14, weight: .bold, design: .monospaced))
              .foregroundStyle(paper)
              .frame(width: 56, height: 40)
              .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(paper, lineWidth: 2))
          }
          .buttonStyle(.plain)
          Button(intent: SkipRestIntent(workoutId: a.workoutId)) {
            Text(a.t("skip", "Skip"))
              .font(.system(size: 14, weight: .bold))
              .foregroundStyle(ink)
              .padding(.horizontal, 14)
              .frame(height: 40)
              .background(accent, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
          }
          .buttonStyle(.plain)
        }
        if !compact {
          ProgressView(timerInterval: context.restRange, countsDown: true) {
            EmptyView()
          } currentValueLabel: {
            EmptyView()
          }
          .tint(accent)
        }
      }
    } else {
      Button(intent: CompleteSetIntent(workoutId: a.workoutId)) {
        HStack(spacing: 8) {
          Image(systemName: "checkmark")
            .font(.system(size: 16, weight: .heavy))
          Text(context.isStale ? a.t("restOverGo", "Rest's up · Complete set") : a.t("complete", "Complete set"))
            .font(.system(size: 16, weight: .heavy))
            .lineLimit(1)
        }
        .foregroundStyle(ink)
        .frame(maxWidth: .infinity, minHeight: compact ? 40 : 48)
        .background(accent, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
      }
      .buttonStyle(.plain)
    }
  }
}

/// Apple Watch Smart Stack.
private struct SmallView: View {
  let context: Context

  var body: some View {
    let a = context.attributes
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: 4) {
        Text(context.state.exercise)
          .font(.system(size: 14, weight: .heavy))
          .foregroundStyle(paper)
          .lineLimit(1)
        Spacer(minLength: 2)
        if context.state.setIndex > 0 {
          Text("\(context.state.setIndex)/\(context.state.setCount)")
            .font(.system(size: 12, weight: .semibold, design: .monospaced))
            .foregroundStyle(paper.opacity(0.6))
        }
      }
      if context.state.finishing || context.state.allDone {
        Text(context.state.finishing ? a.t("openToSave", "Open Lock to save") : a.t("allDone", "All sets done"))
          .font(.system(size: 13, weight: .bold))
          .foregroundStyle(accent)
          .lineLimit(2)
      } else if context.resting {
        HStack(alignment: .center, spacing: 6) {
          Text(timerInterval: context.restRange, countsDown: true)
            .font(.system(size: 22, weight: .bold, design: .monospaced))
            .monospacedDigit()
            .foregroundStyle(accent)
          Spacer(minLength: 2)
          Button(intent: SkipRestIntent(workoutId: a.workoutId)) {
            Text(a.t("skip", "Skip"))
              .font(.system(size: 13, weight: .bold))
              .foregroundStyle(ink)
              .padding(.horizontal, 10)
              .frame(height: 30)
              .background(accent, in: Capsule())
          }
          .buttonStyle(.plain)
        }
      } else {
        Text(context.load)
          .font(.system(size: 15, weight: .bold, design: .monospaced))
          .foregroundStyle(accent)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Button(intent: CompleteSetIntent(workoutId: a.workoutId)) {
          HStack(spacing: 4) {
            Image(systemName: "checkmark")
            Text(a.t("complete", "Complete set")).lineLimit(1)
          }
          .font(.system(size: 13, weight: .heavy))
          .foregroundStyle(ink)
          .frame(maxWidth: .infinity, minHeight: 30)
          .background(accent, in: Capsule())
        }
        .buttonStyle(.plain)
      }
    }
    .padding(.horizontal, 2)
  }
}
