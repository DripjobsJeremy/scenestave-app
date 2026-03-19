/**
 * SceneStave - Donation Entry Form Component
 * 
 * A reusable component for entering individual donation records.
 * Supports both monetary and in-kind donations with full validation.
 * 
 * Props:
 * @param {number} index - Display number for "Donation Entry #X"
 * @param {object} value - Donation data object
 * @param {function} onChange - Callback: (donationData) => void
 * @param {function} onRemove - Callback: () => void (optional)
 * @param {array} productions - Array of production objects
 * @param {array} campaigns - Array of campaign objects
 */

const DonationEntryForm = ({ 
    index = 1,
    value = {},
    onChange,
    onRemove,
    productions = [],
    campaigns = []
}) => {
    // Initialize default values
    const donationData = {
        donationType: 'monetary',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        recurringType: 'One-Time', // canonical values
        campaignType: 'general',
        campaignId: '',
        campaignName: '',
        paymentMethod: '',
        transactionNumber: '',
        taxDeductible: true,
        inKindDescription: '',
        inKindCategory: '',
        estimatedValue: '',
        acknowledgmentSent: false,
        acknowledgmentDate: '',
        acknowledgmentMethod: '',
        notes: '',
        ...value
    };

    // Validation errors state
    const [errors, setErrors] = React.useState({});

    // Handle field changes
    const handleFieldChange = (field, newValue) => {
        const updatedData = {
            ...donationData,
            [field]: newValue
        };

        // Clear acknowledgment fields when unchecking
        if (field === 'acknowledgmentSent' && newValue === false) {
            updatedData.acknowledgmentDate = '';
            updatedData.acknowledgmentMethod = '';
        }

        onChange(updatedData);
    };

    // Validate field
    const validateField = (field) => {
        const newErrors = { ...errors };
        const isMonetary = donationData.donationType === 'monetary';

        switch (field) {
            case 'amount':
                if (isMonetary && (!donationData.amount || parseFloat(donationData.amount) <= 0)) {
                    newErrors.amount = 'Amount is required and must be greater than 0';
                } else {
                    delete newErrors.amount;
                }
                break;
            case 'estimatedValue':
                if (!isMonetary && (!donationData.estimatedValue || parseFloat(donationData.estimatedValue) <= 0)) {
                    newErrors.estimatedValue = 'Estimated value is required and must be greater than 0';
                } else {
                    delete newErrors.estimatedValue;
                }
                break;
            case 'date':
                if (!donationData.date) {
                    newErrors.date = 'Date is required';
                } else if (donationData.date > today) {
                    newErrors.date = 'Date cannot be in the future';
                } else {
                    delete newErrors.date;
                }
                break;
            case 'inKindDescription':
                if (!isMonetary && !donationData.inKindDescription) {
                    newErrors.inKindDescription = 'Description is required';
                } else {
                    delete newErrors.inKindDescription;
                }
                break;
            case 'inKindCategory':
                if (!isMonetary && !donationData.inKindCategory) {
                    newErrors.inKindCategory = 'Category is required';
                } else {
                    delete newErrors.inKindCategory;
                }
                break;
            case 'acknowledgmentDate':
                if (donationData.acknowledgmentSent && !donationData.acknowledgmentDate) {
                    newErrors.acknowledgmentDate = 'Acknowledgment date is required';
                } else {
                    delete newErrors.acknowledgmentDate;
                }
                break;
            case 'acknowledgmentMethod':
                if (donationData.acknowledgmentSent && !donationData.acknowledgmentMethod) {
                    newErrors.acknowledgmentMethod = 'Acknowledgment method is required';
                } else {
                    delete newErrors.acknowledgmentMethod;
                }
                break;
            default:
                break;
        }

        setErrors(newErrors);
    };

    // Get active productions
    const activeProductions = productions.filter(p => {
        if (!p.performanceDates || p.performanceDates.length === 0) return true;
        const lastDate = new Date(Math.max(...p.performanceDates.map(d => new Date(d))));
        return lastDate >= new Date();
    });

    // Get active campaigns
    const activeCampaigns = campaigns.filter(c => c.status === 'active' || !c.status);

    const isMonetary = donationData.donationType === 'monetary';
    
    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-base font-semibold text-gray-200">
                    {isMonetary ? '💰' : '💝'} {isMonetary ? 'Donation' : 'In-Kind Donation'} Entry #{index}
                </h4>
                {onRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-900 hover:bg-opacity-20 transition-colors"
                        title="Remove this donation"
                    >
                        ✕ Remove
                    </button>
                )}
            </div>

            {/* Donation Type Selector */}
            <div className="mb-4 pb-3 border-b border-gray-700">
                <label className="block text-xs text-gray-400 mb-2">Donation Type <span className="text-red-500">*</span></label>
                <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name={`donationType_${index}`}
                            value="monetary"
                            checked={donationData.donationType === 'monetary'}
                            onChange={(e) => handleChange('donationType', e.target.value)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm">💵 Monetary</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name={`donationType_${index}`}
                            value="in-kind"
                            checked={donationData.donationType === 'in-kind'}
                            onChange={(e) => handleChange('donationType', e.target.value)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm">💝 In-Kind</span>
                    </label>
                </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
                {/* MONETARY FIELDS */}
                {isMonetary && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Amount */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">
                                    Amount <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={donationData.amount}
                                        onChange={(e) => handleChange('amount', e.target.value)}
                                        onBlur={() => validateField('amount')}
                                        placeholder="0.00"
                                        className={`w-full bg-gray-700 p-2 pl-7 rounded text-sm ${errors.amount ? 'border border-red-500' : ''}`}
                                    />
                                </div>
                                {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount}</p>}
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={donationData.date}
                                    onChange={(e) => handleChange('date', e.target.value)}
                                    onBlur={() => validateField('date')}
                                    max={today}
                                    className={`w-full bg-gray-700 p-2 rounded text-sm ${errors.date ? 'border border-red-500' : ''}`}
                                />
                                {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Recurring Type */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Recurring Type</label>
                                <select
                                    value={donationData.recurringType}
                                    onChange={(e) => handleChange('recurringType', e.target.value)}
                                    className="w-full bg-gray-700 p-2 rounded text-sm"
                                >
                                    <option value="One-Time">One-Time</option>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Quarterly">Quarterly</option>
                                    <option value="Annual">Annual</option>
                                </select>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Payment Method</label>
                                <select
                                    value={donationData.paymentMethod}
                                    onChange={(e) => handleChange('paymentMethod', e.target.value)}
                                    className="w-full bg-gray-700 p-2 rounded text-sm"
                                >
                                    <option value="">Select method...</option>
                                    <option value="Check">Check</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Credit Card">Credit Card</option>
                                    <option value="Wire Transfer">Wire Transfer</option>
                                    <option value="Online Platform">Online Platform</option>
                                </select>
                            </div>
                        </div>

                        {/* Transaction Number */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Transaction Number</label>
                            <input
                                type="text"
                                value={donationData.transactionNumber}
                                onChange={(e) => handleChange('transactionNumber', e.target.value)}
                                placeholder="Check # or transaction ID"
                                className="w-full bg-gray-700 p-2 rounded text-sm"
                            />
                        </div>

                        {/* Tax Deductible */}
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={donationData.taxDeductible}
                                    onChange={(e) => handleChange('taxDeductible', e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm">Tax-Deductible</span>
                            </label>
                        </div>
                    </>
                )}

                {/* IN-KIND FIELDS */}
                {!isMonetary && (
                    <>
                        {/* Description */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={donationData.inKindDescription}
                                onChange={(e) => handleChange('inKindDescription', e.target.value)}
                                onBlur={() => validateField('inKindDescription')}
                                placeholder="e.g., Sound equipment rental, volunteer hours, materials"
                                className={`w-full bg-gray-700 p-2 rounded text-sm ${errors.inKindDescription ? 'border border-red-500' : ''}`}
                            />
                            {errors.inKindDescription && <p className="text-xs text-red-400 mt-1">{errors.inKindDescription}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Category */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={donationData.inKindCategory}
                                    onChange={(e) => handleChange('inKindCategory', e.target.value)}
                                    onBlur={() => validateField('inKindCategory')}
                                    className={`w-full bg-gray-700 p-2 rounded text-sm ${errors.inKindCategory ? 'border border-red-500' : ''}`}
                                >
                                    <option value="">Select category...</option>
                                    <option value="Equipment">Equipment</option>
                                    <option value="Services">Services</option>
                                    <option value="Materials">Materials</option>
                                    <option value="Other">Other</option>
                                </select>
                                {errors.inKindCategory && <p className="text-xs text-red-400 mt-1">{errors.inKindCategory}</p>}
                            </div>

                            {/* Estimated Value */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">
                                    Estimated Value <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={donationData.estimatedValue}
                                        onChange={(e) => handleChange('estimatedValue', e.target.value)}
                                        onBlur={() => validateField('estimatedValue')}
                                        placeholder="0.00"
                                        className={`w-full bg-gray-700 p-2 pl-7 rounded text-sm ${errors.estimatedValue ? 'border border-red-500' : ''}`}
                                    />
                                </div>
                                {errors.estimatedValue && <p className="text-xs text-red-400 mt-1">{errors.estimatedValue}</p>}
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={donationData.date}
                                onChange={(e) => handleChange('date', e.target.value)}
                                onBlur={() => validateField('date')}
                                max={today}
                                className={`w-full bg-gray-700 p-2 rounded text-sm ${errors.date ? 'border border-red-500' : ''}`}
                            />
                            {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
                        </div>
                    </>
                )}

                {/* Campaign/Fund Section (shared) */}
                <div className="bg-gray-900 bg-opacity-50 rounded p-3 space-y-3">
                    <label className="block text-xs text-gray-400 font-semibold">Campaign / Fund</label>
                    
                    <div className="space-y-2">
                        {/* Production */}
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name={`campaignType_${index}`}
                                value="production"
                                checked={donationData.campaignType === 'production'}
                                onChange={(e) => handleChange('campaignType', e.target.value)}
                                className="w-4 h-4 mt-0.5"
                            />
                            <div className="flex-1">
                                <span className="text-sm">Production</span>
                                {donationData.campaignType === 'production' && (
                                    <select
                                        value={donationData.campaignId}
                                        onChange={(e) => handleChange('campaignId', e.target.value)}
                                        className="w-full bg-gray-700 p-2 rounded text-sm mt-1"
                                    >
                                        <option value="">Select production...</option>
                                        {activeProductions.map(prod => (
                                            <option key={prod.id} value={prod.id}>{prod.showName}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </label>

                        {/* General Fund */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name={`campaignType_${index}`}
                                value="general"
                                checked={donationData.campaignType === 'general'}
                                onChange={(e) => handleChange('campaignType', e.target.value)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm">General Operating Fund</span>
                        </label>

                        {/* Custom Campaign */}
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name={`campaignType_${index}`}
                                value="custom"
                                checked={donationData.campaignType === 'custom'}
                                onChange={(e) => handleChange('campaignType', e.target.value)}
                                className="w-4 h-4 mt-0.5"
                            />
                            <div className="flex-1">
                                <span className="text-sm">Custom Campaign</span>
                                {donationData.campaignType === 'custom' && (
                                    <select
                                        value={donationData.campaignId}
                                        onChange={(e) => handleChange('campaignId', e.target.value)}
                                        className="w-full bg-gray-700 p-2 rounded text-sm mt-1"
                                    >
                                        <option value="">Select campaign...</option>
                                        {activeCampaigns.map(camp => (
                                            <option key={camp.id} value={camp.id}>{camp.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </label>
                    </div>
                </div>

                {/* Acknowledgment Section */}
                <div className="bg-gray-900 bg-opacity-50 rounded p-3 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={donationData.acknowledgmentSent}
                            onChange={(e) => handleChange('acknowledgmentSent', e.target.checked)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm font-semibold">Acknowledgment Sent</span>
                    </label>

                    {donationData.acknowledgmentSent && (
                        <div className="grid grid-cols-2 gap-3 pl-6">
                            {/* Acknowledgment Method */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">
                                    Method <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={donationData.acknowledgmentMethod}
                                    onChange={(e) => handleChange('acknowledgmentMethod', e.target.value)}
                                    onBlur={() => validateField('acknowledgmentMethod')}
                                    className={`w-full bg-gray-700 p-2 rounded text-sm ${errors.acknowledgmentMethod ? 'border border-red-500' : ''}`}
                                >
                                    <option value="">Select method...</option>
                                    <option value="Email">Email</option>
                                    <option value="Letter">Letter</option>
                                    <option value="Phone Call">Phone Call</option>
                                </select>
                                {errors.acknowledgmentMethod && <p className="text-xs text-red-400 mt-1">{errors.acknowledgmentMethod}</p>}
                            </div>

                            {/* Acknowledgment Date */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={donationData.acknowledgmentDate}
                                    onChange={(e) => handleChange('acknowledgmentDate', e.target.value)}
                                    onBlur={() => validateField('acknowledgmentDate')}
                                    max={today}
                                    className={`w-full bg-gray-700 p-2 rounded text-sm ${errors.acknowledgmentDate ? 'border border-red-500' : ''}`}
                                />
                                {errors.acknowledgmentDate && <p className="text-xs text-red-400 mt-1">{errors.acknowledgmentDate}</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Notes</label>
                    <textarea
                        value={donationData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        placeholder="Add any notes about this donation..."
                        rows="3"
                        className="w-full bg-gray-700 p-2 rounded text-sm resize-none"
                    />
                </div>
            </div>
        </div>
    );
};

// PropTypes definition (as comments for reference)
/*
DonationEntryForm.propTypes = {
    index: PropTypes.number,
    value: PropTypes.shape({
        donationType: PropTypes.oneOf(['monetary', 'in-kind']),
        amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        date: PropTypes.string,
        recurringType: PropTypes.string,
        campaignType: PropTypes.string,
        campaignId: PropTypes.string,
        campaignName: PropTypes.string,
        paymentMethod: PropTypes.string,
        transactionNumber: PropTypes.string,
        taxDeductible: PropTypes.bool,
        inKindDescription: PropTypes.string,
        inKindCategory: PropTypes.string,
        estimatedValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        acknowledgmentSent: PropTypes.bool,
        acknowledgmentDate: PropTypes.string,
        acknowledgmentMethod: PropTypes.string,
        notes: PropTypes.string
    }),
    onChange: PropTypes.func.isRequired,
    onRemove: PropTypes.func,
    productions: PropTypes.array,
    campaigns: PropTypes.array
};
*/

// Make available globally for browser usage
window.DonationEntryForm = DonationEntryForm;

