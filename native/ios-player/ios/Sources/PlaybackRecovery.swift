import Foundation

// Preserve the intended position when an interruption cancels an AVPlayer seek.
struct PlaybackRecovery {
    private(set) var automaticResume: AutomaticResumePolicy?
    private(set) var seekFailed = false

    mutating func prepare(policy: AutomaticResumePolicy?) { automaticResume = policy; seekFailed = false }
    mutating func chosePosition() { automaticResume = nil }
    mutating func completedSeek(_ success: Bool) { seekFailed = !success }
    func position(current: Double, saved: Double, requested: Double, initialPending: Bool) -> Double {
        if current.isFinite && current > 0 && !initialPending && !seekFailed { return current }
        return max(saved.isFinite ? max(0, saved) : 0, requested.isFinite ? max(0, requested) : 0)
    }
}
