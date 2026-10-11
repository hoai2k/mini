import SwiftUI
import ContactsUI
import MessageUI
import GamesChatCore

/// Home: call someone by username or phone number (typed, or picked from
/// Contacts), call back a recent, or drop into the open chat everyone shares.
struct HomeView: View {
    @EnvironmentObject var model: AppModel
    @State private var target = ""
    @State private var showAccount = false
    @State private var calling = false
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        TextField("Username or phone number", text: $target)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .keyboardType(.default)
                            .submitLabel(.go)
                            .focused($focused)
                            .onSubmit(call)
                        Button { ContactPicker.present { target = $0 } } label: { Image(systemName: "person.crop.circle") }
                            .buttonStyle(.borderless)
                            .accessibilityLabel("Pick from Contacts")
                    }
                    Button(action: call) {
                        Label(calling ? "Calling…" : "Video call", systemImage: "video.fill")
                            .frame(maxWidth: .infinity)
                            .font(.headline)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    .disabled(target.trimmingCharacters(in: .whitespaces).isEmpty || calling)
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                } header: {
                    Text("Call someone")
                } footer: {
                    Text("Calls ring on their iPhone or iPad when they have Games Chat. If they don't, you can text them a link to join from a browser.")
                }

                Section {
                    Button { model.joinOpenChat() } label: {
                        Label("Join the open chat", systemImage: "person.3.fill")
                    }
                } footer: {
                    Text("The same chat as the website: anyone there can see and talk to you.")
                }

                if !model.recents.isEmpty {
                    Section("Recent") {
                        ForEach(model.recents) { r in
                            Button { Task { await model.call(r.target) } } label: {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(r.name).foregroundStyle(.primary)
                                        Text(r.target.hasPrefix("+") ? r.target : "@\(r.target)").font(.caption).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "video").foregroundStyle(.green)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Games Chat")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showAccount = true } label: { Image(systemName: "person.circle") }
                        .accessibilityLabel("Account")
                }
            }
            .sheet(isPresented: $showAccount) { AccountView() }
            .alert(item: $model.invite) { invite in
                Alert(title: Text("\(invite.target) isn't on Games Chat yet"),
                      message: Text("Send them a link? They can join your call from any browser."),
                      primaryButton: .default(Text("Send link")) {
                          model.startInviteRoom(invite.room)
                          InviteSender.present(invite)
                      },
                      secondaryButton: .cancel())
            }
        }
    }

    private func call() {
        let t = target
        guard !t.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        focused = false
        calling = true
        Task {
            await model.call(t)
            calling = false
            if model.outgoing?.failed == false || model.screen != .home { target = "" }
        }
    }
}

/// The system contact picker: no Contacts permission needed, it hands back
/// only the number the person taps.
@MainActor
enum ContactPicker {
    static func present(_ onPick: @escaping (String) -> Void) {
        let picker = CNContactPickerViewController()
        let delegate = Delegate(onPick)
        picker.delegate = delegate
        picker.displayedPropertyKeys = [CNContactPhoneNumbersKey]
        picker.predicateForEnablingContact = NSPredicate(format: "phoneNumbers.@count > 0")
        picker.predicateForSelectionOfContact = NSPredicate(format: "phoneNumbers.@count == 1")
        Presenter.present(picker, keeping: delegate)
    }

    final class Delegate: NSObject, CNContactPickerDelegate {
        let onPick: (String) -> Void
        init(_ onPick: @escaping (String) -> Void) { self.onPick = onPick }

        func contactPicker(_ picker: CNContactPickerViewController, didSelect contact: CNContact) {
            if let n = contact.phoneNumbers.first?.value.stringValue { onPick(n) }
            Task { @MainActor in Presenter.release(picker) }
        }

        func contactPicker(_ picker: CNContactPickerViewController, didSelect property: CNContactProperty) {
            if let n = (property.value as? CNPhoneNumber)?.stringValue { onPick(n) }
            Task { @MainActor in Presenter.release(picker) }
        }

        func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
            Task { @MainActor in Presenter.release(picker) }
        }
    }
}

/// Texts (or, without Messages, shares) a link to the call's room.
@MainActor
enum InviteSender {
    static func present(_ invite: AppModel.Invite) {
        let link = Rooms.webLink(room: invite.room, base: Config.webApp)
        let text = "Join my video chat on Games Chat: \(link.absoluteString)"
        let digits = invite.target.filter { $0.isNumber || $0 == "+" }
        if MFMessageComposeViewController.canSendText() {
            let vc = MFMessageComposeViewController()
            let delegate = Delegate()
            vc.messageComposeDelegate = delegate
            if digits.count >= 7 { vc.recipients = [digits] }
            vc.body = text
            Presenter.present(vc, keeping: delegate)
        } else {
            Presenter.present(UIActivityViewController(activityItems: [text], applicationActivities: nil))
        }
    }

    final class Delegate: NSObject, MFMessageComposeViewControllerDelegate {
        func messageComposeViewController(_ c: MFMessageComposeViewController, didFinishWith result: MessageComposeResult) {
            c.dismiss(animated: true)
            Task { @MainActor in Presenter.release(c) }
        }
    }
}
