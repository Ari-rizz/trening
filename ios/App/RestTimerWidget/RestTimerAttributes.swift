import WidgetKit
import SwiftUI
import ActivityKit

@available(iOS 16.1, *)
public struct RestTimerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var totalSeconds: Int
        public var endDate: Date
        public init(totalSeconds: Int, endDate: Date) {
            self.totalSeconds = totalSeconds
            self.endDate = endDate
        }
        public var startDate: Date {
            endDate.addingTimeInterval(-TimeInterval(totalSeconds))
        }
    }
    public var startedAt: Date
    public init(startedAt: Date) {
        self.startedAt = startedAt
    }
}
