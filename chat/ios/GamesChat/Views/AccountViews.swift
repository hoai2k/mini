import SwiftUI
import GamesChatCore

/// First run: pick a name and a username. A phone number can be added later
/// (Account), so iPads without one work the same way.
struct OnboardingView: View {
    @EnvironmentObject var model: AppModel
    @State private var name = ""
    @State private var handle = ""
    @State private var error: String?
    @State private var busy = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(spacing: 8) {
                        Image(systemName: "video.bubble.fill")
                            .font(.system(size: 56))
                            .foregroundStyle(.pink, .teal)
                        Text("Video chat with silly faces and quick games.")
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
                }
                Section {
                    TextField("Your name", text: $name)
                        .textContentType(.givenName)
                    HStack(spacing: 2) {
                        Text("@").foregroundStyle(.secondary)
                        TextField("username", text: $handle)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .textContentType(.username)
                    }
                } header: {
                    Text("Make your account")
                } footer: {
                    Text("Friends call you by your username, or by your phone number once you add it. Usernames are 3 to 20 letters, numbers, dots or underscores.")
                }
                if let error { Section { Text(error).foregroundStyle(.red) } }
                Section {
                    Button {
                        Task { await create() }
                    } label: {
                        HStack { Spacer(); if busy { ProgressView() } else { Text("Start").bold() }; Spacer() }
                    }
                    .disabled(busy || name.trimmingCharacters(in: .whitespaces).isEmpty || !Handle.isValid(handle))
                }
            }
            .navigationTitle("Games Chat")
        }
    }

    private func create() async {
        busy = true
        defer { busy = false }
        do {
            try await model.createAccount(name: name.trimmingCharacters(in: .whitespaces), handle: handle)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

/// Name, username, phone number, and deleting the account.
struct AccountView: View {
    @EnvironmentObject var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var phone = ""
    @State private var pendingPhone: String?
    @State private var code = ""
    @State private var error: String?
    @State private var busy = false
    @State private var confirmDelete = false

    var body: some View {
        NavigationStack {
            Form {
                Section("You") {
                    HStack {
                        TextField("Name", text: $name)
                        if name != model.account?.name, !name.trimmingCharacters(in: .whitespaces).isEmpty {
                            Button("Save") { run { try await model.rename(name) } }
                        }
                    }
                    LabeledContent("Username", value: "@\(model.account?.handle ?? "")")
                }

                Section {
                    if let last4 = model.account?.phoneLast4 {
                        LabeledContent("Phone number", value: "•••• \(last4)")
                        Button("Remove phone number", role: .destructive) { run { try await model.removePhone() } }
                    } else if let pending = pendingPhone {
                        Text("Enter the code texted to \(pending)")
                        TextField("Code", text: $code).keyboardType(.numberPad).textContentType(.oneTimeCode)
                        Button("Confirm") { run { try await model.confirmPhone(pending, code: code); pendingPhone = nil; code = "" } }
                            .disabled(code.count < 4)
                    } else {
                        TextField("Your phone number", text: $phone).keyboardType(.phonePad).textContentType(.telephoneNumber)
                        Button("Text me a code") { run { pendingPhone = try await model.startPhone(phone) } }
                            .disabled(phone.filter(\.isNumber).count < 7)
                    }
                } header: {
                    Text("Phone number")
                } footer: {
                    Text("Optional. With it, friends who have your number can call you on Games Chat. It's only ever matched, never shown to anyone.")
                }

                if let error { Section { Text(error).foregroundStyle(.red) } }

                Section {
                    LabeledContent("Ringing", value: model.calls.voipToken == nil ? "Not set up on this device" : "On")
                } footer: {
                    Text("Calls ring on this device even when the app is closed.")
                }

                Section {
                    Button("Delete my account", role: .destructive) { confirmDelete = true }
                } footer: {
                    Text("Deletes your account, username and phone number from the server.")
                }
            }
            .disabled(busy)
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .onAppear { name = model.account?.name ?? "" }
            .confirmationDialog("Delete your account?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive) { run { try await model.deleteAccount(); dismiss() } }
            } message: {
                Text("Friends won't be able to call you until you make a new one.")
            }
        }
    }

    private func run(_ work: @escaping () async throws -> Void) {
        error = nil
        busy = true
        Task {
            do { try await work() } catch { self.error = error.localizedDescription }
            busy = false
        }
    }
}
