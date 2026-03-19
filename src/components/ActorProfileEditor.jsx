const { useState, useEffect } = React;

function ActorProfileEditor({ actor, onSave, onCancel }) {
  const [activeTab, setActiveTab] = useState('contact');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    actorProfile: {
      experienceLevel: '',
      vocalRange: '',
      specialSkills: [],
      resume: null,
      headshots: [],
      auditionVideos: [],
      sizeCard: {
        height: '',
        weight: '',
        shirtSize: '',
        pantsSize: '',
        shoeSize: '',
        jacketSize: '',
        dressSize: '',
        chest: '',
        waist: '',
        inseam: ''
      }
    }
  });
  const [newSkill, setNewSkill] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (actor) {
      const profile = actor.actorProfile || {};

      // Clean corrupted unionAffiliation data
      let cleanUnions = [];
      if (Array.isArray(profile.unionAffiliation)) {
        // Filter out single-character entries (corrupted from string spread)
        cleanUnions = profile.unionAffiliation.filter(u => typeof u === 'string' && u.length > 1);
      } else if (typeof profile.unionAffiliation === 'string' && profile.unionAffiliation) {
        // Old format: single string value - wrap in array
        cleanUnions = [profile.unionAffiliation];
      }

      setFormData({
        ...actor,
        actorProfile: {
          experienceLevel: '',
          vocalRange: '',
          specialSkills: [],
          resume: null,
          headshots: [],
          auditionVideos: [],
          sizeCard: {
            height: '',
            weight: '',
            shirtSize: '',
            pantsSize: '',
            shoeSize: '',
            jacketSize: '',
            dressSize: '',
            chest: '',
            waist: '',
            inseam: ''
          },
          ...profile,
          // Normalize experience level to lowercase for consistency
          experienceLevel: (profile.experienceLevel || '').toLowerCase(),
          unionAffiliation: cleanUnions
        }
      });
    }
  }, [actor]);

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
    if (!formData.firstName || !formData.lastName) {
      alert('Please enter first and last name');
      setActiveTab('contact');
      return;
    }

    if (formData.email && !formData.email.includes('@')) {
      alert('Please enter a valid email address');
      setActiveTab('contact');
      return;
    }

    onSave(formData);
  };

  const tabs = [
    { id: 'contact', label: 'Contact Info', icon: '📧' },
    { id: 'materials', label: 'Materials', icon: '📁' },
    { id: 'sizes', label: 'Size Card', icon: '📏' },
    { id: 'skills', label: 'Skills', icon: '⭐' }
  ];

  return (
    <div className="bg-white rounded-lg">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
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
      <div className="p-6 max-h-[60vh] overflow-y-auto">
        {/* Contact Info Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Last name"
                  required
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
                placeholder="actor@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                <select
                  title="Experience Level"
                  value={formData.actorProfile?.experienceLevel || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actorProfile: { ...formData.actorProfile, experienceLevel: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select level</option>
                  <option value="beginner">🟢 Beginner</option>
                  <option value="intermediate">🔵 Intermediate</option>
                  <option value="advanced">🟣 Advanced</option>
                  <option value="professional">🟠 Professional</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vocal Range</label>
                <input
                  type="text"
                  value={formData.actorProfile?.vocalRange || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actorProfile: { ...formData.actorProfile, vocalRange: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., Soprano, Tenor"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Union Affiliations</label>
              <div className="space-y-2 border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded border-b border-gray-200 pb-2 mb-2">
                  <input
                    type="checkbox"
                    checked={Array.isArray(formData.actorProfile?.unionAffiliation) && formData.actorProfile.unionAffiliation.includes('Non-Union')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          actorProfile: { ...formData.actorProfile, unionAffiliation: ['Non-Union'] }
                        });
                      } else {
                        const raw = formData.actorProfile?.unionAffiliation;
                        const unions = Array.isArray(raw) ? raw.filter(u => u !== 'Non-Union') : [];
                        setFormData({
                          ...formData,
                          actorProfile: { ...formData.actorProfile, unionAffiliation: unions }
                        });
                      }
                    }}
                    className="w-4 h-4 text-gray-600 rounded focus:ring-gray-500"
                  />
                  <span className="text-sm font-medium">Non-Union</span>
                </label>
                {[
                  { value: 'AEA', label: 'AEA - Actors\' Equity Association' },
                  { value: 'AEA-EMC', label: 'AEA - Equity Eligible (EMC)' },
                  { value: 'SAG-AFTRA', label: 'SAG-AFTRA' },
                  { value: 'SAG-AFTRA-Eligible', label: 'SAG-AFTRA Eligible' },
                  { value: 'AGMA', label: 'AGMA - American Guild of Musical Artists' },
                  { value: 'AGVA', label: 'AGVA - American Guild of Variety Artists' },
                  { value: 'CAEA', label: 'CAEA - Canadian Actors\' Equity' },
                  { value: 'UK-Equity', label: 'Equity (UK)' }
                ].map(union => (
                  <label key={union.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={Array.isArray(formData.actorProfile?.unionAffiliation) && formData.actorProfile.unionAffiliation.includes(union.value)}
                      onChange={(e) => {
                        const raw = formData.actorProfile?.unionAffiliation;
                        const unions = Array.isArray(raw) ? raw : [];
                        const updated = e.target.checked
                          ? [...unions.filter(u => u !== 'Non-Union'), union.value]
                          : unions.filter(u => u !== union.value);
                        setFormData({
                          ...formData,
                          actorProfile: { ...formData.actorProfile, unionAffiliation: updated }
                        });
                      }}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm">{union.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(() => {
                  const unions = Array.isArray(formData.actorProfile?.unionAffiliation) ? formData.actorProfile.unionAffiliation : [];
                  if (unions.length === 0) return 'No selection';
                  if (unions.includes('Non-Union')) return 'Non-Union';
                  return unions.length + ' union' + (unions.length !== 1 ? 's' : '') + ' selected';
                })()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract Preference</label>
              <select
                title="Contract Preference"
                value={formData.actorProfile?.contractPreference || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  actorProfile: { ...formData.actorProfile, contractPreference: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Not specified</option>
                <option value="union-only">Union Only</option>
                <option value="non-union-only">Non-Union Only</option>
                <option value="union-and-non-union">Union & Non-Union</option>
                <option value="open-to-all">Open to All Contract Types</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">What types of contracts this actor will accept</p>
            </div>
          </div>
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            {/* Resume Section */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Resume</h4>
              {formData.actorProfile?.resume ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-2xl">📄</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{formData.actorProfile.resume.fileName}</p>
                    <p className="text-xs text-gray-600">
                      {(formData.actorProfile.resume.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <a
                    href={formData.actorProfile.resume.data}
                    download={formData.actorProfile.resume.fileName}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      actorProfile: { ...formData.actorProfile, resume: null }
                    })}
                    className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload(e.target.files[0], 'resume')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    disabled={uploading}
                  />
                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, or DOCX format</p>
                </div>
              )}
            </div>

            {/* Headshots Section */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Headshots</h4>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {formData.actorProfile?.headshots?.map(headshot => (
                  <div key={headshot.id} className="relative group">
                    <img
                      src={headshot.data}
                      alt="Headshot"
                      className="w-full aspect-square object-cover rounded-lg border-2 border-gray-300"
                    />
                    {headshot.isPrimary && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600 text-white text-xs rounded">
                        Primary
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!headshot.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryHeadshot(headshot.id)}
                          className="flex-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteHeadshot(headshot.id)}
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files[0], 'headshot')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  disabled={uploading}
                />
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, or GIF format</p>
              </div>
            </div>

            {/* Audition Videos Section */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Audition Videos</h4>
              {formData.actorProfile?.auditionVideos?.length > 0 && (
                <div className="space-y-2 mb-3">
                  {formData.actorProfile.auditionVideos.map(video => (
                    <div key={video.id} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-2xl">🎥</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{video.fileName}</p>
                        <p className="text-xs text-gray-600">
                          {(video.fileSize / 1024 / 1024).toFixed(1)} MB
                          {video.role && ` • ${video.role}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteVideo(video.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e.target.files[0], 'video')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  disabled={uploading}
                />
                <p className="text-xs text-gray-500 mt-1">MP4, MOV, or AVI format</p>
              </div>
            </div>

            {uploading && (
              <div className="text-center py-4">
                <p className="text-purple-600 font-medium">Uploading file...</p>
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
                  value={formData.actorProfile?.sizeCard?.height || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actorProfile: {
                      ...formData.actorProfile,
                      sizeCard: { ...formData.actorProfile.sizeCard, height: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., 5'8&quot;"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                <input
                  type="text"
                  value={formData.actorProfile?.sizeCard?.weight || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actorProfile: {
                      ...formData.actorProfile,
                      sizeCard: { ...formData.actorProfile.sizeCard, weight: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., 165 lbs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shirt Size</label>
                <input
                  type="text"
                  value={formData.actorProfile?.sizeCard?.shirtSize || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actorProfile: {
                      ...formData.actorProfile,
                      sizeCard: { ...formData.actorProfile.sizeCard, shirtSize: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., M, L"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pants Size</label>
                <input
                  type="text"
                  value={formData.actorProfile?.sizeCard?.pantsSize || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actorProfile: {
                      ...formData.actorProfile,
                      sizeCard: { ...formData.actorProfile.sizeCard, pantsSize: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., 32x34"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shoe Size</label>
                <input
                  type="text"
                  value={formData.actorProfile?.sizeCard?.shoeSize || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actorProfile: {
                      ...formData.actorProfile,
                      sizeCard: { ...formData.actorProfile.sizeCard, shoeSize: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., 10.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jacket Size</label>
                <input
                  type="text"
                  value={formData.actorProfile?.sizeCard?.jacketSize || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actorProfile: {
                      ...formData.actorProfile,
                      sizeCard: { ...formData.actorProfile.sizeCard, jacketSize: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., 40R"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dress Size</label>
                <input
                  type="text"
                  value={formData.actorProfile?.sizeCard?.dressSize || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actorProfile: {
                      ...formData.actorProfile,
                      sizeCard: { ...formData.actorProfile.sizeCard, dressSize: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., 8, 10"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chest</label>
                <input
                  type="text"
                  value={formData.actorProfile?.sizeCard?.chest || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actorProfile: {
                      ...formData.actorProfile,
                      sizeCard: { ...formData.actorProfile.sizeCard, chest: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="inches"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Waist</label>
                <input
                  type="text"
                  value={formData.actorProfile?.sizeCard?.waist || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actorProfile: {
                      ...formData.actorProfile,
                      sizeCard: { ...formData.actorProfile.sizeCard, waist: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="inches"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inseam</label>
                <input
                  type="text"
                  value={formData.actorProfile?.sizeCard?.inseam || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actorProfile: {
                      ...formData.actorProfile,
                      sizeCard: { ...formData.actorProfile.sizeCard, inseam: e.target.value }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="inches"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 italic">
              Size card information will be available to Wardrobe Designers when this actor is cast in a production.
            </p>
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Skills</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., Stage Combat, Tap Dancing, Guitar"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Add
                </button>
              </div>

              {formData.actorProfile?.specialSkills?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.actorProfile.specialSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(index)}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No special skills added yet</p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Examples: Stage Combat, Juggling, Singing, Dancing (Ballet, Tap, Jazz), Musical Instruments,
                Accents/Dialects, Sign Language, Gymnastics, Fire Performance, etc.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 p-4 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Save Actor'}
        </button>
      </div>
    </div>
  );
}

window.ActorProfileEditor = ActorProfileEditor;
