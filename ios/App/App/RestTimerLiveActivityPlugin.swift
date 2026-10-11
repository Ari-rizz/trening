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
    public let identifier = "RestTimerLiveActivityPlugin"
    public let jsName = "RestTimerLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
    ]

    private var currentActivity: Activity<RestTimerAttributes>?

    @objc func isSupported(_ call: CAPPluginCall) {
        call.resolve(["supported": ActivityAuthorizationInfo().areActivitiesEnabled])
    }

    @objc func startActivity(_ call: CAPPluginCall) {
        let totalSeconds = call.getInt("totalSeconds") ?? 60
        let now = Date()
        let endDate = now.addingTimeInterval(TimeInterval(totalSeconds))

        if #available(iOS 16.2, *) {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                call.resolve(["started": false])
                return
            }

            if let existing = currentActivity {
                Task {
                    await existing.end(nil, dismissalPolicy: .immediate)
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

        if #available(iOS 16.2, *), let activity = currentActivity {
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
        if #available(iOS 16.2, *), let activity = currentActivity {
            Task {
                await activity.end(nil, dismissalPolicy: .immediate)
                currentActivity = nil
                call.resolve(["ended": true])
            }
        } else {
            call.resolve(["ended": false])
        }
    }
}
