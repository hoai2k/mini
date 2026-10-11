import SwiftUI
import GamesChatCore

struct RootView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        Group {
            if model.account == nil {
                OnboardingView()
            } else if case .call(let room) = model.screen {
                CallScreen(room: room)
            } else {
                HomeView()
            }
        }
        .alert("Games Chat", isPresented: Binding(get: { model.notice != nil }, set: { if !$0 { model.notice = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(model.notice ?? "")
        }
    }
}

/// The call: the web app full screen, with native banners on top for the
/// call I'm ringing out on and for anyone asking to join.
struct CallScreen: View {
    @EnvironmentObject var model: AppModel
    let room: String

    var body: some View {
        ZStack(alignment: .top) {
            Color.black.ignoresSafeArea()
            WebCallView(room: room, name: model.myName,
                        onHangup: { model.hangup() },
                        onPeers: { model.peersChanged($0) })
                .ignoresSafeArea()
            VStack(spacing: 8) {
                if let out = model.outgoing { OutgoingBanner(outgoing: out) }
                ForEach(model.joinRequests) { call in JoinRequestBanner(call: call) }
            }
            .padding(.horizontal, 12)
            .padding(.top, 56)
            .frame(maxWidth: 520)
            .animation(.spring(response: 0.35), value: model.joinRequests)
            .animation(.spring(response: 0.35), value: model.outgoing)
        }
        .statusBarHidden(false)
    }
}

struct OutgoingBanner: View {
    @EnvironmentObject var model: AppModel
    let outgoing: AppModel.Outgoing

    var body: some View {
        HStack(spacing: 12) {
            if !outgoing.failed { ProgressView().tint(.white) }
            else { Image(systemName: "phone.down.fill").foregroundStyle(.red) }
            Text(outgoing.status).font(.headline).lineLimit(2)
            Spacer(minLength: 4)
            if outgoing.failed {
                Button("OK") { model.outgoing = nil; if model.peers == 0 { model.hangup() } }
                    .buttonStyle(.borderedProminent).tint(.gray)
            } else {
                Button(role: .destructive) { model.cancelOutgoing() } label: { Text("Cancel") }
                    .buttonStyle(.borderedProminent).tint(.red)
            }
        }
        .padding(14)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18))
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}

/// Someone called while I'm already talking: let them join this call?
struct JoinRequestBanner: View {
    @EnvironmentObject var model: AppModel
    let call: Call

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "person.crop.circle.badge.plus").font(.title2).foregroundStyle(.green)
                VStack(alignment: .leading) {
                    Text("\(call.from.name) is calling").font(.headline)
                    Text("Let them join this call?").font(.subheadline).foregroundStyle(.secondary)
                }
            }
            HStack {
                Button { model.decline(call) } label: { Text("Not now").frame(maxWidth: .infinity) }
                    .buttonStyle(.bordered)
                Button { model.letIn(call) } label: { Text("Let them in").bold().frame(maxWidth: .infinity) }
                    .buttonStyle(.borderedProminent).tint(.green)
            }
        }
        .padding(14)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18))
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}
