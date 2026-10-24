import SwiftUI
import WatchKit

// Lock B×C palette.
let ink = Color(red: 0x0A / 255, green: 0x0A / 255, blue: 0x0A / 255)
let paper = Color(red: 0xF2 / 255, green: 0xF1 / 255, blue: 0xEC / 255)
let accent = Color(red: 0xFF / 255, green: 0xD4 / 255, blue: 0x3B / 255)

private func mono(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
  .system(size: size, weight: weight, design: .monospaced)
}

struct RootView: View {
  @EnvironmentObject private var store: WatchStore

  var body: some View {
    if let s = store.snapshot {
      TabView {
        WorkoutPage(s: s)
        ExercisesPage(s: s)
      }
      .tabViewStyle(.verticalPage)
      .containerBackground(ink, for: .tabView)
    } else {
      IdleView()
    }
  }
}

// MARK: - Idle

private struct IdleView: View {
  @EnvironmentObject private var store: WatchStore

  var body: some View {
    VStack(spacing: 10) {
      Text("Lock")
        .font(.system(size: 22, weight: .heavy))
        .foregroundStyle(ink)
        .padding(.horizontal, 12)
        .padding(.vertical, 4)
        .background(accent, in: RoundedRectangle(cornerRadius: 8))
        .rotationEffect(.degrees(-4))
      if store.ended == "finished" {
        Label(store.t("saved"), systemImage: "checkmark.circle.fill")
          .font(.system(size: 15, weight: .bold))
          .foregroundStyle(accent)
          .multilineTextAlignment(.center)
      }
      Text(store.t("idle"))
        .font(.system(size: 16, weight: .bold))
        .foregroundStyle(paper)
        .multilineTextAlignment(.center)
      Text(store.t("idleHint"))
        .font(.system(size: 13))
        .foregroundStyle(paper.opacity(0.6))
        .multilineTextAlignment(.center)
    }
    .padding(.horizontal, 6)
  }
}

// MARK: - Workout

private struct WorkoutPage: View {
  @EnvironmentObject private var store: WatchStore
  let s: WorkoutSnapshot

  private var resting: Bool {
    guard let ends = s.restEndsAt else { return false }
    return ends / 1000 > store.now.timeIntervalSince1970
  }

  var body: some View {
    VStack(spacing: 6) {
      Header(s: s)
      if s.finishing {
        Spacer()
        ProgressView().tint(accent)
        Text(store.t("saving"))
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(paper)
          .multilineTextAlignment(.center)
        Spacer()
      } else if resting, let ends = s.restEndsAt {
        RestView(s: s, ends: Date(timeIntervalSince1970: ends / 1000))
      } else if let target = s.nextOpen {
        SetView(s: s, ei: target.ei, si: target.si)
      } else {
        AllDoneView()
      }
    }
    .padding(.horizontal, 4)
  }
}

private struct Header: View {
  @EnvironmentObject private var store: WatchStore
  let s: WorkoutSnapshot

  var body: some View {
    HStack(spacing: 4) {
      Text(Date(timeIntervalSince1970: s.startedAt / 1000), style: .timer)
        .font(mono(13, .semibold))
        .foregroundStyle(paper.opacity(0.7))
      Spacer()
      if store.health.heartRate > 0 {
        Image(systemName: "heart.fill")
          .font(.system(size: 11))
          .foregroundStyle(.red)
        Text("\(store.health.heartRate)")
          .font(mono(13, .semibold))
          .foregroundStyle(paper)
      }
      Text(WorkoutFormat.fill(store.t("progress"), ["done": "\(s.doneSets)", "total": "\(s.totalSets)"]))
        .font(mono(11, .semibold))
        .foregroundStyle(paper.opacity(0.6))
    }
  }
}

private struct SetView: View {
  enum Field { case weight, reps }

  @EnvironmentObject private var store: WatchStore
  let s: WorkoutSnapshot
  let ei: Int
  let si: Int

  @State private var field: Field = .weight
  @State private var weight: Double = 0
  @State private var reps: Double = 0
  @State private var loadedKey = ""
  @FocusState private var focused: Bool

  private var ex: WExercise { s.exercises[ei] }
  private var cur: WSet { ex.sets[si] }
  private var key: String { "\(s.id)-\(ei)-\(si)-\(cur.w)-\(cur.r)" }
  private var step: Double { s.unit == "lb" ? 5 : 2.5 }
  private var crown: Binding<Double> { field == .weight ? $weight : $reps }

  var body: some View {
    VStack(alignment: .leading, spacing: 5) {
      Text(ex.name)
        .font(.system(size: 17, weight: .heavy))
        .foregroundStyle(paper)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
      Text(WorkoutFormat.fill(store.t("setOf"), ["i": "\(si + 1)", "n": "\(ex.sets.count)"]))
        .font(mono(12, .semibold))
        .foregroundStyle(paper.opacity(0.6))

      HStack(spacing: 6) {
        ValueBox(
          value: weight > 0 ? WorkoutFormat.weight(weight) : (ex.bw ? store.t("bodyweight") : "0"),
          unit: weight > 0 || !ex.bw ? s.unit : "",
          selected: field == .weight
        )
        .onTapGesture { field = .weight; focused = true }
        ValueBox(value: reps > 0 ? "\(Int(reps))" : "—", unit: store.t("reps"), selected: field == .reps)
          .onTapGesture { field = .reps; focused = true }
      }
      .focusable(true)
      .focused($focused)
      .digitalCrownRotation(
        crown,
        from: 0,
        through: field == .weight ? 1000 : 100,
        by: field == .weight ? step : 1,
        sensitivity: .medium,
        isContinuous: false,
        isHapticFeedbackEnabled: true
      )

      Button {
        guard reps >= 1 else {
          field = .reps
          focused = true
          WKInterfaceDevice.current().play(.failure)
          return
        }
        store.send("complete", ei: ei, si: si, w: weight, r: Int(reps))
      } label: {
        HStack(spacing: 6) {
          Image(systemName: "checkmark")
          Text(reps >= 1 ? store.t("complete") : store.t("needReps"))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
        .font(.system(size: 16, weight: .heavy))
        .foregroundStyle(ink)
        .frame(maxWidth: .infinity, minHeight: 44)
        .background(accent, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
      }
      .buttonStyle(.plain)
    }
    .onAppear(perform: load)
    .onChange(of: key) { _, _ in load() }
  }

  private func load() {
    guard loadedKey != key else { return }
    loadedKey = key
    weight = cur.w
    reps = Double(cur.r)
    field = cur.r < 1 ? .reps : (ex.bw && cur.w == 0 ? .reps : .weight)
    focused = true
  }
}

private struct ValueBox: View {
  let value: String
  let unit: String
  let selected: Bool

  var body: some View {
    VStack(spacing: 0) {
      Text(value)
        .font(mono(24))
        .foregroundStyle(selected ? accent : paper)
        .lineLimit(1)
        .minimumScaleFactor(0.5)
      Text(unit.uppercased())
        .font(mono(10, .semibold))
        .foregroundStyle(paper.opacity(0.6))
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, minHeight: 52)
    .overlay(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .stroke(selected ? accent : paper.opacity(0.3), lineWidth: 2)
    )
  }
}

private struct RestView: View {
  @EnvironmentObject private var store: WatchStore
  let s: WorkoutSnapshot
  let ends: Date

  private var start: Date { min(ends, ends.addingTimeInterval(-Double(max(1, s.restTotal)))) }

  var body: some View {
    VStack(spacing: 6) {
      Text(store.t("rest").uppercased())
        .font(mono(11, .bold))
        .foregroundStyle(paper.opacity(0.6))
      Text(timerInterval: start...ends, countsDown: true)
        .font(mono(42))
        .monospacedDigit()
        .foregroundStyle(accent)
        .frame(maxWidth: .infinity)
      ProgressView(timerInterval: start...ends, countsDown: true) {
        EmptyView()
      } currentValueLabel: {
        EmptyView()
      }
      .tint(accent)
      HStack(spacing: 6) {
        PillButton(title: "−15") { store.send("rest", delta: -15) }
        PillButton(title: "+15") { store.send("rest", delta: 15) }
        PillButton(title: store.t("skip"), filled: true) { store.send("skipRest") }
      }
      if let t = s.nextOpen {
        let ex = s.exercises[t.ei]
        let nextSet = ex.sets[t.si]
        Text("\(store.t("next")): \(ex.name) · \(nextSet.w > 0 ? "\(WorkoutFormat.weight(nextSet.w)) \(s.unit) " : "")× \(nextSet.r)")
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(paper.opacity(0.7))
          .lineLimit(2)
          .multilineTextAlignment(.center)
      }
    }
  }
}

private struct PillButton: View {
  let title: String
  var filled = false
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Text(title)
        .font(.system(size: 14, weight: .bold, design: filled ? .default : .monospaced))
        .foregroundStyle(filled ? ink : paper)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .frame(maxWidth: .infinity, minHeight: 36)
        .background(filled ? accent : Color.clear, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(filled ? accent : paper, lineWidth: 2))
    }
    .buttonStyle(.plain)
  }
}

private struct AllDoneView: View {
  @EnvironmentObject private var store: WatchStore

  var body: some View {
    VStack(spacing: 10) {
      Spacer(minLength: 0)
      Image(systemName: "flag.checkered")
        .font(.system(size: 30, weight: .bold))
        .foregroundStyle(accent)
      Text(store.t("allDone"))
        .font(.system(size: 17, weight: .heavy))
        .foregroundStyle(paper)
      FinishButton()
      Spacer(minLength: 0)
    }
  }
}

private struct FinishButton: View {
  @EnvironmentObject private var store: WatchStore
  @State private var asking = false

  var body: some View {
    Button { asking = true } label: {
      Label(store.t("finish"), systemImage: "flag.fill")
        .font(.system(size: 15, weight: .heavy))
        .foregroundStyle(ink)
        .frame(maxWidth: .infinity, minHeight: 42)
        .background(accent, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
    .buttonStyle(.plain)
    .alert(store.t("finishAsk"), isPresented: $asking) {
      Button(store.t("finish")) { store.send("finish") }
      Button(store.t("cancel"), role: .cancel) {}
    }
  }
}

// MARK: - Exercises

private struct ExercisesPage: View {
  @EnvironmentObject private var store: WatchStore
  let s: WorkoutSnapshot

  /// The last ticked set of the current exercise (or of any exercise).
  private var lastDone: (ei: Int, si: Int)? {
    let order = [s.current] + s.exercises.indices.filter { $0 != s.current }
    for ei in order where s.exercises.indices.contains(ei) {
      if let si = s.exercises[ei].sets.lastIndex(where: \.done) { return (ei, si) }
    }
    return nil
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 6) {
        Text(store.t("exercises").uppercased())
          .font(mono(11, .bold))
          .foregroundStyle(paper.opacity(0.6))
        ForEach(Array(s.exercises.enumerated()), id: \.offset) { ei, ex in
          let done = ex.sets.filter(\.done).count
          let finished = done == ex.sets.count && !ex.sets.isEmpty
          Button { store.send("select", ei: ei) } label: {
            HStack(spacing: 6) {
              Image(systemName: finished ? "checkmark.circle.fill" : (ei == s.current ? "circle.inset.filled" : "circle"))
                .foregroundStyle(finished || ei == s.current ? accent : paper.opacity(0.5))
              Text(ex.name)
                .font(.system(size: 14, weight: ei == s.current ? .heavy : .semibold))
                .foregroundStyle(paper)
                .lineLimit(1)
              Spacer(minLength: 2)
              Text("\(done)/\(ex.sets.count)")
                .font(mono(12, .semibold))
                .foregroundStyle(paper.opacity(0.6))
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 8)
            .background(ei == s.current ? paper.opacity(0.12) : Color.clear, in: RoundedRectangle(cornerRadius: 10))
          }
          .buttonStyle(.plain)
        }
        if let last = lastDone {
          Button { store.send("uncomplete", ei: last.ei, si: last.si) } label: {
            Label(store.t("undo"), systemImage: "arrow.uturn.backward")
              .font(.system(size: 14, weight: .bold))
              .foregroundStyle(paper)
              .frame(maxWidth: .infinity, minHeight: 38)
              .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(paper, lineWidth: 2))
          }
          .buttonStyle(.plain)
          .padding(.top, 4)
        }
        if !s.finishing && s.doneSets > 0 {
          FinishButton()
        }
      }
      .padding(.horizontal, 4)
    }
  }
}
