import WidgetKit
import SwiftUI
import ActivityKit

@available(iOS 16.1, *)
struct RestTimerLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestTimerAttributes.self) { context in
            LockScreenView(context: context)
                .padding(16)
                .activityBackgroundTint(Color(red: 0.07, green: 0.07, blue: 0.07))
                .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "timer")
                        .font(.system(size: 20))
                        .foregroundColor(.blue)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: context.state.startDate...context.state.endDate, countsDown: true)
                        .font(.system(.title2, design: .monospaced).bold())
                        .monospacedDigit()
                        .frame(maxWidth: 120)
                        .foregroundColor(.white)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Hvile")
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .font(.system(size: 12))
                    .foregroundColor(.blue)
            } compactTrailing: {
                Text(timerInterval: context.state.startDate...context.state.endDate, countsDown: true)
                    .font(.system(size: 13, design: .monospaced).bold())
                    .monospacedDigit()
                    .frame(maxWidth: 60)
                    .foregroundColor(.white)
            } minimal: {
                Image(systemName: "timer")
                    .font(.system(size: 12))
                    .foregroundColor(.blue)
            }
        }
    }
}

@available(iOS 16.1, *)
private func startDate(context: ActivityViewContext<RestTimerAttributes>) -> Date {
    let total = context.state.totalSeconds
    let end = context.state.endDate
    return end.addingTimeInterval(-TimeInterval(total))
}

@available(iOS 16.1, *)
struct LockScreenView: View {
    let context: ActivityViewContext<RestTimerAttributes>

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Hvile")
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
                Text(timerInterval: startDate(context: context)...context.state.endDate, countsDown: true)
                    .font(.system(.title, design: .monospaced).bold())
                    .monospacedDigit()
                    .foregroundColor(.white)
            }
            Spacer()
            Image(systemName: "dumbbell.fill")
                .font(.system(size: 28))
                .foregroundColor(.blue)
        }
    }
}
