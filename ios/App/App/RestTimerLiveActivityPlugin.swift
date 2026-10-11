import Foundation
import Capacitor
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
    }
    public var startedAt: Date
    public init(startedAt: Date) {
        self.startedAt = startedAt
    }
}

@objc(RestTimerLiveActivityPlugin)
public class RestTimerLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let id = "RestTimerLiveActivityPlugin"
    public let tagged = CAPPluginTag.none
    public let identifier = "RestTimerLiveActivityPlugin"
    public let jsName = "RestTimerLiveActivity"
    public let pluginType = CAPPluginType.custom
    public let methods: [CAPBridgedMethod] = [
        CAPBridgedMethod(name: "startActivity", returnType: CAPPluginReturn.promise),
        CAPBridgedMethod(name: "updateActivity", returnType: CAPPluginReturn.promise),
        CAPBridgedMethod(name: "endActivity", returnType: CAPPluginReturn.promise),
        CAPBridgedMethod(name: "isSupported", returnType: CAPPluginReturn.promise),
    ]

    private var currentActivity: Activity<RestTimerAttributes>?

    @objc func isSupported(_ call: CAPPluginCall) {
        call.resolve(["supported": ActivityAuthorizationInfo().areActivitiesEnabled])
    }

    @objc func startActivity(_ call: CAPPluginCall) {
        let totalSeconds = call.getInt("totalSeconds") ?? 60
        let now = Date()
        let endDate = now.addingTimeInterval(TimeInterval(totalSeconds))

        if #available(iOS 16.1, *) {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                call.resolve(["started": false])
                return
            }

            if let existing = currentActivity {
                Task {
                    await existing.end(activity: nil, dismissalPolicy: .immediate)
                    currentActivity = nil
                }
            }

            let attributes = RestTimerAttributes(startedAt: now)
            let state = RestTimerAttributes.ContentState(totalSeconds: totalSeconds, endDate: endDate)

            do {
                let activity = try Activity<RestTimerAttributes>.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: endDate.addingTimeInterval(60)),
                    pushType: nil
                )
                currentActivity = activity
                call.resolve(["started": true])
            } catch {
                call.resolve(["started": false, "error": error.localizedDescription])
            }
        } else {
            call.resolve(["started": false])
        }
    }

    @objc func updateActivity(_ call: CAPPluginCall) {
        let totalSeconds = call.getInt("totalSeconds") ?? 60
        let endDate = Date().addingTimeInterval(TimeInterval(totalSeconds))

        if #available(iOS 16.1, *), let activity = currentActivity {
            let state = RestTimerAttributes.ContentState(totalSeconds: totalSeconds, endDate: endDate)
            Task {
                await activity.update(.init(state: state, staleDate: endDate.addingTimeInterval(60)))
                call.resolve(["updated": true])
            }
        } else {
            call.resolve(["updated": false])
        }
    }

    @objc func endActivity(_ call: CAPPluginCall) {
        if #available(iOS 16.1, *), let activity = currentActivity {
            Task {
                await activity.end(activity: nil, dismissalPolicy: .immediate)
                currentActivity = nil
                call.resolve(["ended": true])
            }
        } else {
            call.resolve(["ended": false])
        }
    }
}
