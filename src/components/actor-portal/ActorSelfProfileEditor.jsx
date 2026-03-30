const { useState } = React;

function ActorSelfProfileEditor({ actor, onSave, onCancel }) {
  const [activeTab, setActiveTab] = useState('contact');
  const [formData, setFormData] = useState(() => {
    // Initialise once from actor on mount — never reset by re-renders
    const raw = actor?.actorProfile || {};

    // Clean up corrupted union data
    let cleanedUnion = raw.unionAffiliation;
    if (typeof cleanedUnion === 'string') {
      cleanedUnion = [];
    } else if (Array.isArray(cleanedUnion)) {
      cleanedUnion = cleanedUnion.filter(u => u && u.length > 1);
    } else {
      cleanedUnion = [];
    }

    const cleanedProfile = {
      experienceLevel: '',
      vocalRange: '',
      specialSkills: [],
      resume: null,
      headshots: [],
      auditionVideos: [],
      sizeCard: {
        height: '', weight: '', shirtSize: '', pantsSize: '',
        shoeSize: '', jacketSize: '', dressSize: '', chest: '', waist: '', inseam: ''
      },
      contractPreference: '',
      ...raw,
      unionAffiliation: cleanedUnion,
      experienceLevel: (raw.experienceLevel || '').toLowerCase(),
    };

    return { ...actor, actorProfile: cleanedProfile };
  });
  const [newSkill, setNewSkill] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleFileUpload = async (file, type) => {
    if (!file) return;

    setUploading(true);
    try {
      const result = await window.actorsService.uploadFile(file);

      if (type === 'resume') {
        setFormData({
          ...formData,
          actorProfile: {
            ...formData.actorProfile,
            resume: { ...result, url: result.data }
          }
        });
      } else if (type === 'headshot') {
        const newHeadshot = {
          ...result,
          id: 'headshot_' + Date.now(),
          isPrimary: formData.actorProfile.headshots.length === 0
        };
        setFormData({
          ...formData,
          actorProfile: {
            ...formData.actorProfile,
            headshots: [...formData.actorProfile.headshots, newHeadshot]
          }
        });
      } else if (type === 'video') {
        const newVideo = {
          ...result,
          id: 'video_' + Date.now(),
          role: ''
        };
        setFormData({
          ...formData,
          actorProfile: {
            ...formData.actorProfile,
            auditionVideos: [...formData.actorProfile.auditionVideos, newVideo]
          }
        });
      }
    } catch (error) {
      if (error.message.includes('too large')) {
        alert('File Too Large\n\n' + error.message + '\n\nPlease compress or resize your file and try again.');
      } else {
        alert('Error uploading file: ' + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteHeadshot = (headshotId) => {
    const updated = formData.actorProfile.headshots.filter(h => h.id !== headshotId);
    setFormData({
      ...formData,
      actorProfile: {
        ...formData.actorProfile,
        headshots: updated
      }
    });
  };

  const handleSetPrimaryHeadshot = (headshotId) => {
    const updated = formData.actorProfile.headshots.map(h => ({
      ...h,
      isPrimary: h.id === headshotId
    }));
    setFormData({
      ...formData,
      actorProfile: {
        ...formData.actorProfile,
        headshots: updated
      }
    });
  };

  const handleDeleteVideo = (videoId) => {
    const updated = formData.actorProfile.auditionVideos.filter(v => v.id !== videoId);
    setFormData({
      ...formData,
      actorProfile: {
        ...formData.actorProfile,
        auditionVideos: updated
      }
    });
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;

    const skills = [...(formData.actorProfile.specialSkills || []), newSkill.trim()];
    setFormData({
      ...formData,
      actorProfile: {
        ...formData.actorProfile,
        specialSkills: skills
      }
    });
    setNewSkill('');
  };

  const handleRemoveSkill = (index) => {
    const skills = formData.actorProfile.specialSkills.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      actorProfile: {
        ...formData.actorProfile,
        specialSkills: skills
      }
    });
  };

  const handleSave = () => {
    setSaveError('');

    if (!formData.firstName || !formData.lastName) {
      setSaveError('Please enter first and last name');
      setActiveTab('contact');
      return;
    }

    if (formData.email && !formData.email.includes('@')) {
      setSaveError('Please enter a valid email address');
      setActiveTab('contact');
      return;
    }

    try {
      if (formData.actorProfile.sizeCard) {
        formData.actorProfile.sizeCard.updatedAt = new Date().toISOString();
      }

      window.actorsService.updateActor(actor.id, formData);

      if (onSave) {
        onSave(formData);
      }
    } catch (error) {
      setSaveError('Error saving profile: ' + error.message);
    }
  };

  const tabs = [
    { id: 'contact', label: 'Contact Info', icon: '📧' },
    { id: 'materials', label: 'Materials', icon: '📁' },
    { id: 'sizes', label: 'Size Card', icon: '📏' },
    { id: 'skills', label: 'Skills', icon: '⭐' }
  ];

  const experienceLevels = [
    { value: 'beginner', label: '🟢 Beginner' },
    { value: 'intermediate', label: '🔵 Intermediate' },
    { value: 'advanced', label: '🟣 Advanced' },
    { value: 'professional', label: '🟠 Professional' }
  ];

  const unionOptions = [
    { value: 'AEA',               label: "AEA (Actors' Equity Association)" },
    { value: 'AEA-EMC',           label: 'EMC (Equity Membership Candidate)' },
    { value: 'SAG-AFTRA',         label: 'SAG-AFTRA' },
    { value: 'SAG-AFTRA-Eligible', label: 'SAG-AFTRA Eligible' },
    { value: 'AGMA',              label: 'AGMA (American Guild of Musical Artists)' },
    { value: 'AGVA',              label: 'AGVA (American Guild of Variety Artists)' },
    { value: 'Non-Union',         label: 'Non-Union' },
  ];

  const contractOptions = [
    { value: 'union-only', label: 'Union Only' },
    { value: 'non-union-only', label: 'Non-Union Only' },
    { value: 'union-and-non-union', label: 'Union & Non-Union' },
    { value: 'open-to-all', label: 'Open to All' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Edit My Profile</h1>
            <p className="text-purple-100 mt-1">Update your information and materials</p>
          </div>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Save Error */}
          {saveError && (
            <div className="p-4 bg-red-50 border-b border-red-200">
              <p className="text-red-700 text-sm">{saveError}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex gap-1 p-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Contact Info Tab */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pronouns</label>
                  <select
                    value={formData.actorProfile.pronouns || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      actorProfile: { ...formData.actorProfile, pronouns: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select pronouns...</option>
                    <option value="he/him">he/him</option>
                    <option value="she/her">she/her</option>
                    <option value="they/them">they/them</option>
                    <option value="he/they">he/they</option>
                    <option value="she/they">she/they</option>
                    <option value="any">any pronouns</option>
                    <option value="custom">Custom (specify in bio)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={formData.actorProfile.bio || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      actorProfile: { ...formData.actorProfile, bio: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-vertical"
                    rows={4}
                    placeholder="Tell us about yourself, your experience, interests, and what you bring to the stage..."
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">A brief introduction about yourself</p>
                    <p className="text-xs text-gray-400">{(formData.actorProfile.bio || '').length}/500</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                  <select
                    value={formData.actorProfile.experienceLevel}
                    onChange={(e) => setFormData({
                      ...formData,
                      actorProfile: { ...formData.actorProfile, experienceLevel: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select...</option>
                    {experienceLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vocal Range</label>
                  <input
                    type="text"
                    value={formData.actorProfile.vocalRange || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      actorProfile: { ...formData.actorProfile, vocalRange: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., Tenor, Soprano, Alto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Union Affiliation</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {unionOptions.map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={(formData.actorProfile.unionAffiliation || []).includes(value)}
                          onChange={(e) => {
                            const current = formData.actorProfile.unionAffiliation || [];
                            const updated = e.target.checked
                              ? [...current, value]
                              : current.filter(u => u !== value);
                            setFormData({
                              ...formData,
                              actorProfile: { ...formData.actorProfile, unionAffiliation: updated }
                            });
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Preference</label>
                  <select
                    value={formData.actorProfile.contractPreference || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      actorProfile: { ...formData.actorProfile, contractPreference: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select...</option>
                    {contractOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Materials Tab */}
            {activeTab === 'materials' && (
              <div className="space-y-6">
                {/* Resume */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Resume</h3>
                  {formData.actorProfile.resume ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-green-600 font-medium">Resume uploaded</span>
                      <span className="text-sm text-gray-600">({formData.actorProfile.resume.name})</span>
                      <button
                        onClick={() => setFormData({
                          ...formData,
                          actorProfile: { ...formData.actorProfile, resume: null }
                        })}
                        className="ml-auto text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <p className="text-gray-500 mb-3">No resume uploaded</p>
                      <label className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        Upload Resume
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e.target.files[0], 'resume')}
                          disabled={uploading}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Headshots */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Headshots</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {formData.actorProfile.headshots.map(headshot => (
                      <div key={headshot.id} className="relative border border-gray-200 rounded-lg overflow-hidden">
                        <img src={headshot.data} alt="Headshot" className="w-full h-40 object-cover" />
                        <div className="absolute top-2 right-2 flex gap-1">
                          {!headshot.isPrimary && (
                            <button
                              onClick={() => handleSetPrimaryHeadshot(headshot.id)}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                              title="Set as primary"
                            >
                              Primary
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteHeadshot(headshot.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded"
                          >
                            Delete
                          </button>
                        </div>
                        {headshot.isPrimary && (
                          <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-xs text-center py-1">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <label className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Add Headshot
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files[0], 'headshot')}
                      disabled={uploading}
                    />
                  </label>
                </div>

                {/* Audition Videos */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Audition Videos</h3>
                  {formData.actorProfile.auditionVideos.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {formData.actorProfile.auditionVideos.map(video => (
                        <div key={video.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-700">{video.name}</span>
                          <button
                            onClick={() => handleDeleteVideo(video.id)}
                            className="ml-auto text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Add Video
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files[0], 'video')}
                      disabled={uploading}
                    />
                  </label>
                </div>

                {uploading && (
                  <div className="text-center p-4 text-purple-600 font-medium">
                    Uploading...
                  </div>
                )}
              </div>
            )}

            {/* Size Card Tab */}
            {activeTab === 'sizes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                    <input
                      type="text"
                      value={formData.actorProfile.sizeCard?.height || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        actorProfile: {
                          ...formData.actorProfile,
                          sizeCard: { ...formData.actorProfile.sizeCard, height: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="5'10&quot;"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                    <input
                      type="text"
                      value={formData.actorProfile.sizeCard?.weight || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        actorProfile: {
                          ...formData.actorProfile,
                          sizeCard: { ...formData.actorProfile.sizeCard, weight: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="170 lbs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chest</label>
                    <input
                      type="text"
                      value={formData.actorProfile.sizeCard?.chest || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        actorProfile: {
                          ...formData.actorProfile,
                          sizeCard: { ...formData.actorProfile.sizeCard, chest: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder='40"'
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Waist</label>
                    <input
                      type="text"
                      value={formData.actorProfile.sizeCard?.waist || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        actorProfile: {
                          ...formData.actorProfile,
                          sizeCard: { ...formData.actorProfile.sizeCard, waist: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder='32"'
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inseam</label>
                    <input
                      type="text"
                      value={formData.actorProfile.sizeCard?.inseam || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        actorProfile: {
                          ...formData.actorProfile,
                          sizeCard: { ...formData.actorProfile.sizeCard, inseam: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder='32"'
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shoe Size</label>
                    <input
                      type="text"
                      value={formData.actorProfile.sizeCard?.shoeSize || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        actorProfile: {
                          ...formData.actorProfile,
                          sizeCard: { ...formData.actorProfile.sizeCard, shoeSize: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shirt Size</label>
                    <input
                      type="text"
                      value={formData.actorProfile.sizeCard?.shirtSize || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        actorProfile: {
                          ...formData.actorProfile,
                          sizeCard: { ...formData.actorProfile.sizeCard, shirtSize: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="M, L, XL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pants Size</label>
                    <input
                      type="text"
                      value={formData.actorProfile.sizeCard?.pantsSize || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        actorProfile: {
                          ...formData.actorProfile,
                          sizeCard: { ...formData.actorProfile.sizeCard, pantsSize: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="32x32"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jacket Size</label>
                    <input
                      type="text"
                      value={formData.actorProfile.sizeCard?.jacketSize || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        actorProfile: {
                          ...formData.actorProfile,
                          sizeCard: { ...formData.actorProfile.sizeCard, jacketSize: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="40R"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dress Size</label>
                  <input
                    type="text"
                    value={formData.actorProfile.sizeCard?.dressSize || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      actorProfile: {
                        ...formData.actorProfile,
                        sizeCard: { ...formData.actorProfile.sizeCard, dressSize: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="8"
                  />
                </div>
              </div>
            )}

            {/* Skills Tab */}
            {activeTab === 'skills' && (
              <div className="space-y-6">
                {/* Special Skills */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Special Skills</h3>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Add a skill (e.g., Stage Combat, Tap Dance)"
                    />
                    <button
                      onClick={handleAddSkill}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(formData.actorProfile.specialSkills || []).map((skill, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                        {skill}
                        <button
                          onClick={() => handleRemoveSkill(idx)}
                          className="text-purple-500 hover:text-purple-700 ml-1"
                        >
                          x
                        </button>
                      </span>
                    ))}
                    {(formData.actorProfile.specialSkills || []).length === 0 && (
                      <p className="text-gray-400 italic">No skills added yet</p>
                    )}
                  </div>
                </div>

                {/* Common Skills Quick-Add */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Add Common Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Singing', 'Dancing', 'Stage Combat', 'Improv', 'Dialects', 'Piano', 'Guitar',
                      'Tap Dance', 'Ballet', 'Jazz Dance', 'Tumbling', 'Juggling'].map(skill => (
                      <button
                        key={skill}
                        onClick={() => {
                          if (!(formData.actorProfile.specialSkills || []).includes(skill)) {
                            setFormData({
                              ...formData,
                              actorProfile: {
                                ...formData.actorProfile,
                                specialSkills: [...(formData.actorProfile.specialSkills || []), skill]
                              }
                            });
                          }
                        }}
                        disabled={(formData.actorProfile.specialSkills || []).includes(skill)}
                        className="px-3 py-1 border border-gray-300 rounded-full text-sm hover:bg-purple-50 hover:border-purple-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        + {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-6 border-t border-gray-200 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Save Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ActorSelfProfileEditor = ActorSelfProfileEditor;
