/**
 * VolunteerApplicationForm.jsx
 * REBUILT - Clean structure with stable component references
 */

const { useState, useEffect, useCallback, useMemo } = React;

// UTILITY FUNCTIONS (defined once outside component)
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => /^[\d\s\-\(\)\+]+$/.test(phone?.trim() || '');

// STEP COMPONENTS DEFINED OUTSIDE - STABLE REFERENCES
const Step1 = React.memo(({ formData, errors, setField, setNested }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
      
      {/* First Name */}
      <div>
        <label className="block text-sm font-medium mb-1">
          First Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.firstName}
          onChange={(e) => setField('firstName', e.target.value)}
          onBlur={(e) => setField('firstName', e.target.value.trim())}
          className={`w-full border rounded px-3 py-2 ${errors.firstName ? 'border-red-500' : ''}`}
          title="First Name"
          placeholder="Enter your first name"
        />
        {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
      </div>

      {/* Last Name */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Last Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.lastName}
          onChange={(e) => setField('lastName', e.target.value)}
          onBlur={(e) => setField('lastName', e.target.value.trim())}
          className={`w-full border rounded px-3 py-2 ${errors.lastName ? 'border-red-500' : ''}`}
          title="Last Name"
          placeholder="Enter your last name"
        />
        {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setField('email', e.target.value)}
          onBlur={(e) => {
            const email = e.target.value;
            if (email && !isValidEmail(email)) {
              setField('email', email);
            }
          }}
          className={`w-full border rounded px-3 py-2 ${errors.email ? 'border-red-500' : ''}`}
          title="Email Address"
          placeholder="Enter your email address"
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Phone <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setField('phone', e.target.value)}
          onBlur={(e) => !isValidPhone(e.target.value) && setField('phone', e.target.value)}
          className={`w-full border rounded px-3 py-2 ${errors.phone ? 'border-red-500' : ''}`}
          title="Phone Number"
          placeholder="Enter your phone number"
        />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
      </div>

      {/* Date of Birth */}
      <div>
        <label className="block text-sm font-medium mb-1">Date of Birth</label>
        <input
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => setField('dateOfBirth', e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="w-full border rounded px-3 py-2"
          title="Date of Birth"
        />
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium mb-1">Street Address</label>
        <input
          type="text"
          value={formData.address.street}
          onChange={(e) => setNested('address', 'street', e.target.value)}
          className="w-full border rounded px-3 py-2"
          title="Street Address"
          placeholder="Enter your street address"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <input
            type="text"
            value={formData.address.city}
            onChange={(e) => setNested('address', 'city', e.target.value)}
            className="w-full border rounded px-3 py-2"
            title="City"
            placeholder="Enter your city"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">State/Province</label>
          <input
            type="text"
            value={formData.address.state}
            onChange={(e) => setNested('address', 'state', e.target.value)}
            className="w-full border rounded px-3 py-2"
            title="State/Province"
            placeholder="Enter your state or province"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">ZIP/Postal Code</label>
          <input
            type="text"
            value={formData.address.zip}
            onChange={(e) => setNested('address', 'zip', e.target.value)}
            className="w-full border rounded px-3 py-2"
            title="ZIP/Postal Code"
            placeholder="Enter your ZIP or postal code"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Country</label>
          <input
            type="text"
            value={formData.address.country}
            onChange={(e) => setNested('address', 'country', e.target.value)}
            className="w-full border rounded px-3 py-2"
            title="Country"
            placeholder="Enter your country"
          />
        </div>
      </div>
    </div>
  );
});

const Step2 = React.memo(({ formData, setField }) => {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (day) => {
    setField('availability', {
      ...formData.availability,
      [day]: !formData.availability[day]
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Availability</h3>
      
      <div>
        <label className="block text-sm font-medium mb-2">Available Days</label>
        <div className="space-y-2">
          {daysOfWeek.map(day => (
            <label key={day} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.availability[day] || false}
                onChange={() => toggleDay(day)}
                className="rounded"
              />
              <span>{day}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">General Availability Notes</label>
        <textarea
          rows={3}
          value={formData.availabilityNotes}
          onChange={(e) => setField('availabilityNotes', e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="e.g., Available weekday evenings, not available first week of month..."
        />
      </div>
    </div>
  );
});

const Step3 = React.memo(({ formData, setField, opportunities }) => {
  const categories = [
    { id: 'events', label: 'Event Support' },
    { id: 'administrative', label: 'Administrative' },
    { id: 'outreach', label: 'Community Outreach' },
    { id: 'technical', label: 'Technical/IT' },
    { id: 'creative', label: 'Creative/Design' },
    { id: 'other', label: 'Other' }
  ];

  const toggleCategory = (catId) => {
    const current = formData.categories || [];
    setField('categories', current.includes(catId)
      ? current.filter(c => c !== catId)
      : [...current, catId]
    );
  };

  const toggleOpportunity = (oppId) => {
    const current = formData.specificOpportunities || [];
    setField('specificOpportunities', current.includes(oppId)
      ? current.filter(o => o !== oppId)
      : [...current, oppId]
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Interests & Skills</h3>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          Areas of Interest <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {categories.map(cat => (
            <label key={cat.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={(formData.categories || []).includes(cat.id)}
                onChange={() => toggleCategory(cat.id)}
                className="rounded"
              />
              <span>{cat.label}</span>
            </label>
          ))}
        </div>
      </div>

      {opportunities && opportunities.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">Specific Opportunities</label>
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-3">
            {opportunities.map(opp => (
              <label key={opp.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(formData.specificOpportunities || []).includes(opp.id)}
                  onChange={() => toggleOpportunity(opp.id)}
                  className="rounded"
                />
                <span className="text-sm">{opp.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Tell us about any relevant experience or skills (max 500 characters)
        </label>
        <textarea
          rows={4}
          value={formData.experience}
          onChange={(e) => {
            const val = e.target.value;
            if (val.length <= 500) setField('experience', val);
          }}
          className="w-full border rounded px-3 py-2"
          placeholder="Share any relevant background, skills, or experience..."
        />
        <p className="text-sm text-gray-500 mt-1">{formData.experience.length}/500 characters</p>
      </div>
    </div>
  );
});

const Step4 = React.memo(({ formData, errors, setField, setNested }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Emergency Contact & References</h3>
      
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Emergency Contact</h4>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
            <input
              type="text"
              value={formData.emergencyContact.name}
              onChange={(e) => setNested('emergencyContact', 'name', e.target.value)}
              className={`w-full border rounded px-3 py-2 ${errors['emergencyContact.name'] ? 'border-red-500' : ''}`}
              title="Emergency Contact Full Name"
              placeholder="Enter full name"
            />
          {errors['emergencyContact.name'] && (
            <p className="text-red-500 text-sm mt-1">{errors['emergencyContact.name']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Relationship</label>
            <input
              type="text"
              value={formData.emergencyContact.relationship}
              onChange={(e) => setNested('emergencyContact', 'relationship', e.target.value)}
              className="w-full border rounded px-3 py-2"
              title="Emergency Contact Relationship"
              placeholder="e.g., Spouse, Parent, Friend"
            />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Phone <span className="text-red-500">*</span>
          </label>
            <input
              type="tel"
              value={formData.emergencyContact.phone}
              onChange={(e) => setNested('emergencyContact', 'phone', e.target.value)}
              onBlur={(e) => !isValidPhone(e.target.value) && setNested('emergencyContact', 'phone', e.target.value)}
              className={`w-full border rounded px-3 py-2 ${errors['emergencyContact.phone'] ? 'border-red-500' : ''}`}
              title="Emergency Contact Phone Number"
              placeholder="Enter phone number"
            />
          {errors['emergencyContact.phone'] && (
            <p className="text-red-500 text-sm mt-1">{errors['emergencyContact.phone']}</p>
          )}
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">References (Optional)</h4>
        <p className="text-sm text-gray-600 mb-3">Please provide at least one reference if possible</p>
        
        {[0, 1].map(idx => (
          <div key={idx} className="mb-4 p-3 bg-gray-50 rounded">
            <h5 className="text-sm font-medium mb-2">Reference {idx + 1}</h5>
            
            <div className="space-y-2">
              <input
                type="text"
                value={formData.references[idx]?.name || ''}
                onChange={(e) => {
                  const refs = [...formData.references];
                  refs[idx] = { ...refs[idx], name: e.target.value };
                  setField('references', refs);
                }}
                placeholder="Name"
                className="w-full border rounded px-3 py-2"
              />
              
              <input
                type="email"
                value={formData.references[idx]?.email || ''}
                onChange={(e) => {
                  const refs = [...formData.references];
                  refs[idx] = { ...refs[idx], email: e.target.value };
                  setField('references', refs);
                }}
                placeholder="Email"
                className="w-full border rounded px-3 py-2"
              />
              
              <input
                type="tel"
                value={formData.references[idx]?.phone || ''}
                onChange={(e) => {
                  const refs = [...formData.references];
                  refs[idx] = { ...refs[idx], phone: e.target.value };
                  setField('references', refs);
                }}
                placeholder="Phone"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const Step5 = React.memo(({ formData, errors, setField }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Review & Agreements</h3>
      
      <div className="bg-gray-50 rounded p-4 space-y-2">
        <h4 className="font-medium">Application Summary</h4>
        <div className="text-sm space-y-1">
          <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
          <p><strong>Email:</strong> {formData.email}</p>
          <p><strong>Phone:</strong> {formData.phone}</p>
          {formData.categories && formData.categories.length > 0 && (
            <p><strong>Interests:</strong> {formData.categories.join(', ')}</p>
          )}
        </div>
      </div>

      <div>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={formData.agreedToTerms}
            onChange={(e) => setField('agreedToTerms', e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            I agree to the terms and conditions and volunteer policies <span className="text-red-500">*</span>
          </span>
        </label>
        {errors.agreedToTerms && <p className="text-red-500 text-sm mt-1">{errors.agreedToTerms}</p>}
      </div>

      <div>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={formData.consentBackgroundCheck}
            onChange={(e) => setField('consentBackgroundCheck', e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            I consent to a background check if required for my volunteer position
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Additional Comments</label>
        <textarea
          rows={3}
          value={formData.additionalComments}
          onChange={(e) => setField('additionalComments', e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="Any additional information you'd like to share..."
        />
      </div>
    </div>
  );
});

// MAIN COMPONENT
window.VolunteerApplicationForm = ({ isModal = false, prefill = null, onClose, onSubmitted }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: { street: '', city: '', state: '', zip: '', country: '' },
    availability: {},
    availabilityNotes: '',
    categories: [],
    specificOpportunities: [],
    experience: '',
    emergencyContact: { name: '', relationship: '', phone: '' },
    references: [{}, {}],
    agreedToTerms: false,
    consentBackgroundCheck: false,
    additionalComments: ''
  });

  const [errors, setErrors] = useState({});
  const [opportunities, setOpportunities] = useState([]);

  // Load opportunities
  useEffect(() => {
    if (window.volunteerStorageService) {
      const opps = window.volunteerStorageService.getVolunteerOpportunities?.() || [];
      setOpportunities(opps.filter(o => o.status === 'active'));
    }
  }, []);

  // Apply prefill
  useEffect(() => {
    if (prefill) {
      console.log('[VolunteerApplicationForm] Applying prefill:', prefill);
      setFormData(prev => ({
        ...prev,
        categories: prefill.category ? [prefill.category] : prev.categories,
        specificOpportunities: prefill.opportunityId ? [prefill.opportunityId] : prev.specificOpportunities
      }));
    }
  }, [prefill]);

  // Stable handlers
  const setField = useCallback((key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  const setNested = useCallback((parent, key, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [key]: value }
    }));
    setErrors(prev => ({ ...prev, [`${parent}.${key}`]: undefined }));
  }, []);

  // Validation
  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 0) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!isValidEmail(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
      else if (!isValidPhone(formData.phone)) newErrors.phone = 'Invalid phone format';
    }
    
    if (step === 2) {
      if (!formData.categories || formData.categories.length === 0) {
        newErrors.categories = 'Please select at least one area of interest';
      }
    }
    
    if (step === 3) {
      if (!formData.emergencyContact.name.trim()) {
        newErrors['emergencyContact.name'] = 'Emergency contact name is required';
      }
      if (!formData.emergencyContact.phone.trim()) {
        newErrors['emergencyContact.phone'] = 'Emergency contact phone is required';
      } else if (!isValidPhone(formData.emergencyContact.phone)) {
        newErrors['emergencyContact.phone'] = 'Invalid phone format';
      }
    }
    
    if (step === 4) {
      if (!formData.agreedToTerms) {
        newErrors.agreedToTerms = 'You must agree to the terms';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(stepIndex)) {
      setStepIndex(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setStepIndex(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    
    setIsSubmitting(true);
    
    try {
      const application = {
        id: `app_${Date.now()}`,
        ...formData,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        reviewedBy: null,
        reviewedAt: null,
        notes: []
      };

      if (window.volunteerStorageService?.saveVolunteerApplication) {
        window.volunteerStorageService.saveVolunteerApplication(application);
      }

      setSubmitSuccess(true);
      
      if (onSubmitted) {
        setTimeout(() => onSubmitted(application), 1500);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error submitting application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (submitSuccess) {
    return (
      <div className={isModal ? 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50' : ''}>
        <div className={`bg-white rounded-lg shadow-xl ${isModal ? 'max-w-md' : 'max-w-4xl mx-auto'} w-full p-8`}>
          <div className="text-center">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your interest in volunteering. We'll review your application and be in touch soon.
            </p>
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const stepComponents = [
    <Step1 key="step1" formData={formData} errors={errors} setField={setField} setNested={setNested} />,
    <Step2 key="step2" formData={formData} setField={setField} />,
    <Step3 key="step3" formData={formData} setField={setField} opportunities={opportunities} />,
    <Step4 key="step4" formData={formData} errors={errors} setField={setField} setNested={setNested} />,
    <Step5 key="step5" formData={formData} errors={errors} setField={setField} />
  ];

  const stepTitles = [
    'Personal Information',
    'Availability',
    'Interests & Skills',
    'Emergency Contact & References',
    'Review & Submit'
  ];

  return (
    <div className={isModal ? 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto' : ''}>
      <div className={`bg-white rounded-lg shadow-xl ${isModal ? 'max-w-3xl my-8' : 'max-w-4xl mx-auto'} w-full`}>
        {/* Header */}
        <div className="border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Volunteer Application</h2>
            <p className="text-sm text-gray-600 mt-1">Step {stepIndex + 1} of 5: {stepTitles[stepIndex]}</p>
          </div>
          {isModal && onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          )}
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-2">
            {[0,1,2,3,4].map(i => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Prefill banner */}
        {prefill && (prefill.category || prefill.opportunityId) && stepIndex === 2 && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <strong>Pre-selected:</strong> Your interests based on the opportunity you viewed
          </div>
        )}

        {/* Step content */}
        <div className="p-6">
          {stepComponents[stepIndex]}
        </div>

        {/* Navigation */}
        <div className="border-t p-6 flex justify-between">
          <button
            onClick={handleBack}
            disabled={stepIndex === 0}
            className="px-6 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          <div className="flex gap-2">
            {isModal && onClose && (
              <button onClick={onClose} className="px-6 py-2 border rounded hover:bg-gray-50">
                Cancel
              </button>
            )}
            
            {stepIndex < 4 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
