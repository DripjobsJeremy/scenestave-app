function DonorProfileEditor({ donor, onUpdate }) {
    const [formData, setFormData] = React.useState(() => {
        const profile = donor.donorProfile || {};
        const prefs = profile.preferences || {};
        return {
            name: donor.name || '',
            email: donor.email || '',
            phone: donor.phone || '',
            address: donor.address || '',
            bio: profile.bio || '',
            photoUrl: profile.photoUrl || '',
            preferences: {
                emailUpdates: prefs.emailUpdates !== false,
                eventInvites: prefs.eventInvites !== false,
                mailingList: prefs.mailingList !== false
            }
        };
    });

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setFormData(prev => ({ ...prev, photoUrl: event.target.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        console.log('💾 Saving donor profile...', formData);

        try {
            window.contactsService.updateContact(donor.id, {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                donorProfile: {
                    bio: formData.bio,
                    photoUrl: formData.photoUrl,
                    preferences: formData.preferences
                }
            });

            console.log('✅ Contact updated successfully');

            if (window.showToast) {
                window.showToast('✅ Profile updated successfully', 'success');
            }

            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('❌ Error saving profile:', error);
            if (window.showToast) {
                window.showToast('❌ Error saving profile', 'error');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h2>

                {/* Photo Upload */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Profile Photo
                    </label>
                    <div className="flex items-center gap-4">
                        {formData.photoUrl ? (
                            <div className="relative">
                                <img
                                    src={formData.photoUrl}
                                    alt="Profile"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-4xl">
                                💎
                            </div>
                        )}

                        <div>
                            <input
                                type="file"
                                id="photo-upload"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                            <label
                                htmlFor="photo-upload"
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer inline-block transition-colors"
                            >
                                Upload Photo
                            </label>
                            <p className="text-xs text-gray-500 mt-2">
                                JPG, PNG or GIF. Max 2MB.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label htmlFor="donor-name" className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                        </label>
                        <input
                            id="donor-name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="donor-email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            id="donor-email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="donor-phone" className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                        </label>
                        <input
                            id="donor-phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="donor-address" className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                        </label>
                        <input
                            id="donor-address"
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                </div>

                {/* Bio */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        About Me
                    </label>
                    <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 h-32"
                        placeholder="Share why you support the arts..."
                    />
                </div>

                {/* Preferences */}
                <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Communication Preferences</h3>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.preferences.emailUpdates}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    preferences: { ...prev.preferences, emailUpdates: e.target.checked }
                                }))}
                                className="w-4 h-4 text-purple-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Receive email updates about productions</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.preferences.eventInvites}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    preferences: { ...prev.preferences, eventInvites: e.target.checked }
                                }))}
                                className="w-4 h-4 text-purple-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Receive invitations to special events</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.preferences.mailingList}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    preferences: { ...prev.preferences, mailingList: e.target.checked }
                                }))}
                                className="w-4 h-4 text-purple-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Include me in donor mailing lists</span>
                        </label>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSave}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                    Save Changes
                </button>
            </div>
        </div>
    );
}

window.DonorProfileEditor = DonorProfileEditor;

console.log('✅ DonorProfileEditor component loaded');
