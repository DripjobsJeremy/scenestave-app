const { useState, useRef } = React;

function ActorImportCSV({ onImportComplete }) {
  const [step, setStep] = useState(1); // 1: upload, 2: map, 3: preview, 4: results
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [autoApprove, setAutoApprove] = useState(true);
  const [importResults, setImportResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const actorFields = [
    { value: 'firstName', label: 'First Name', required: true },
    { value: 'lastName', label: 'Last Name', required: true },
    { value: 'email', label: 'Email', required: true },
    { value: 'phone', label: 'Phone', required: false },
    { value: 'experienceLevel', label: 'Experience Level', required: false },
    { value: 'vocalRange', label: 'Vocal Range', required: false },
    { value: 'specialSkills', label: 'Special Skills (comma-separated)', required: false },
    { value: 'height', label: 'Height', required: false },
    { value: 'weight', label: 'Weight', required: false },
    { value: 'shirtSize', label: 'Shirt Size', required: false },
    { value: 'pantsSize', label: 'Pants Size', required: false },
    { value: 'shoeSize', label: 'Shoe Size', required: false }
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setHeaders(results.meta.fields || []);

        // Auto-map matching column names
        const autoMapping = {};
        results.meta.fields.forEach(header => {
          const normalized = header.toLowerCase().replace(/[^a-z]/g, '');
          const match = actorFields.find(field =>
            field.value.toLowerCase() === normalized ||
            field.label.toLowerCase().replace(/[^a-z]/g, '') === normalized
          );
          if (match) {
            autoMapping[header] = match.value;
          }
        });

        setMapping(autoMapping);
        setStep(2);
      },
      error: (error) => {
        alert('Error parsing CSV: ' + error.message);
      }
    });
  };

  const getMappedValue = (row, fieldName) => {
    const csvColumn = Object.keys(mapping).find(h => mapping[h] === fieldName);
    return csvColumn ? (row[csvColumn] || '').trim() : '';
  };

  const handleImport = async () => {
    setLoading(true);
    const imported = [];
    const errors = [];

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];

        try {
          const actorData = {
            firstName: getMappedValue(row, 'firstName'),
            lastName: getMappedValue(row, 'lastName'),
            email: getMappedValue(row, 'email'),
            phone: getMappedValue(row, 'phone'),
            actorProfile: {
              experienceLevel: getMappedValue(row, 'experienceLevel').toLowerCase(),
              vocalRange: getMappedValue(row, 'vocalRange'),
              specialSkills: [],
              sizeCard: {
                height: getMappedValue(row, 'height'),
                weight: getMappedValue(row, 'weight'),
                shirtSize: getMappedValue(row, 'shirtSize'),
                pantsSize: getMappedValue(row, 'pantsSize'),
                shoeSize: getMappedValue(row, 'shoeSize')
              },
              credentials: {
                accountStatus: autoApprove ? 'active' : 'pending',
                accountCreated: new Date().toISOString()
              }
            }
          };

          // Parse comma-separated skills
          const skillsStr = getMappedValue(row, 'specialSkills');
          if (skillsStr) {
            actorData.actorProfile.specialSkills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
          }

          // Validate required fields
          if (!actorData.firstName || !actorData.lastName || !actorData.email) {
            throw new Error('Missing required fields (First Name, Last Name, or Email)');
          }

          if (!actorData.email.includes('@')) {
            throw new Error('Invalid email: ' + actorData.email);
          }

          // Check for duplicate email
          const existing = window.actorsService.loadActors();
          if (existing.some(a => a.email?.toLowerCase() === actorData.email.toLowerCase())) {
            throw new Error('Email already exists: ' + actorData.email);
          }

          // Create actor
          const newActor = window.actorsService.createActor(actorData);

          // Generate temporary password if auto-approved
          if (autoApprove) {
            const tempPassword = 'Welcome' + Math.random().toString(36).substr(2, 6) + '1!';
            const resetResult = await window.actorAuthService.adminResetPassword(newActor.id, tempPassword);

            newActor.tempPassword = resetResult.temporaryPassword || tempPassword;
            newActor._displayEmail = actorData.email;
            newActor._displayName = actorData.firstName + ' ' + actorData.lastName;
            console.log('Password generated for:', newActor._displayName, newActor.tempPassword);
          }

          imported.push(newActor);
        } catch (error) {
          errors.push({
            row: i + 1,
            data: row,
            error: error.message
          });
        }
      }

      setImportResults({ imported, errors });
      setStep(4);
    } catch (error) {
      alert('Import failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setStep(1);
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const requiredMapped = ['firstName', 'lastName', 'email'].every(
    field => Object.values(mapping).includes(field)
  );

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {['Upload', 'Map Fields', 'Preview', 'Results'].map((label, idx) => (
            <div key={idx} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                step > idx + 1 ? 'bg-green-600 text-white' :
                step === idx + 1 ? 'bg-purple-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {step > idx + 1 ? '✓' : idx + 1}
              </div>
              <div className={`text-sm font-medium ml-2 ${
                step === idx + 1 ? 'text-purple-600' : 'text-gray-600'
              }`}>
                {label}
              </div>
              {idx < 3 && (
                <div className={`w-12 h-1 mx-3 rounded ${
                  step > idx + 1 ? 'bg-green-600' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Upload CSV File</h3>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer inline-flex flex-col items-center"
              >
                <div className="text-6xl mb-4">📂</div>
                <div className="text-lg font-medium text-gray-900 mb-2">
                  Click to upload CSV file
                </div>
                <div className="text-sm text-gray-500">
                  .csv files only
                </div>
              </label>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">CSV Format</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li><strong>Required:</strong> First Name, Last Name, Email</li>
                <li><strong>Optional:</strong> Phone, Experience Level, Vocal Range, Special Skills, Size Card fields</li>
                <li>Special Skills should be comma-separated (e.g., "Singing, Dancing, Stage Combat")</li>
                <li>Experience Level: beginner, intermediate, advanced, or professional</li>
              </ul>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  const sample = 'First Name,Last Name,Email,Phone,Experience Level,Vocal Range,Special Skills,Height,Weight\nJohn,Smith,john.smith@example.com,555-0101,intermediate,Tenor,"Singing, Guitar",5\'10",165 lbs\nJane,Doe,jane.doe@example.com,555-0102,advanced,Soprano,"Dancing, Acting",5\'6",130 lbs';
                  const blob = new Blob([sample], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'actor_import_template.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                Download Sample CSV Template
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Map Fields */}
        {step === 2 && (
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Map CSV Columns</h3>
            <p className="text-gray-600 mb-6">
              {csvData.length} rows found. Map your CSV columns to actor fields:
            </p>

            <div className="space-y-3 mb-6">
              {headers.map(header => (
                <div key={header} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-1/3">
                    <div className="text-sm font-medium text-gray-700">{header}</div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      e.g. {csvData[0]?.[header] || '—'}
                    </div>
                  </div>
                  <div className="text-gray-400">→</div>
                  <div className="flex-1">
                    <select
                      value={mapping[header] || ''}
                      onChange={(e) => {
                        const updated = { ...mapping };
                        if (e.target.value) {
                          updated[header] = e.target.value;
                        } else {
                          delete updated[header];
                        }
                        setMapping(updated);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    >
                      <option value="">— Skip this column —</option>
                      {actorFields.map(field => {
                        const alreadyMapped = Object.entries(mapping).some(
                          ([h, v]) => v === field.value && h !== header
                        );
                        return (
                          <option key={field.value} value={field.value} disabled={alreadyMapped}>
                            {field.label} {field.required ? '(required)' : ''} {alreadyMapped ? '(mapped)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {mapping[header] && (
                    <span className="text-green-600 text-lg">✓</span>
                  )}
                </div>
              ))}
            </div>

            {!requiredMapped && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                Please map all required fields: First Name, Last Name, and Email
              </div>
            )}

            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-900">
                  Auto-approve accounts (generate temporary passwords)
                </span>
              </label>
              <p className="text-xs text-gray-600 mt-1 ml-6">
                If unchecked, imported actors will need admin approval before they can log in.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetImport}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!requiredMapped}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Preview Import
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Preview Import</h3>
            <p className="text-gray-600 mb-4">
              Showing first {Math.min(5, csvData.length)} of {csvData.length} rows:
            </p>

            <div className="overflow-x-auto mb-6 border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 border-b">#</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 border-b">First Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 border-b">Last Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 border-b">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 border-b">Phone</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 border-b">Experience</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 5).map((row, idx) => {
                    const firstName = getMappedValue(row, 'firstName');
                    const lastName = getMappedValue(row, 'lastName');
                    const email = getMappedValue(row, 'email');
                    const hasRequired = firstName && lastName && email && email.includes('@');

                    return (
                      <tr key={idx} className={`border-b ${!hasRequired ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm">{firstName || <span className="text-red-500">Missing</span>}</td>
                        <td className="px-4 py-2 text-sm">{lastName || <span className="text-red-500">Missing</span>}</td>
                        <td className="px-4 py-2 text-sm">{email || <span className="text-red-500">Missing</span>}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{getMappedValue(row, 'phone') || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 capitalize">{getMappedValue(row, 'experienceLevel') || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {csvData.length > 5 && (
              <p className="text-sm text-gray-500 mb-4">
                ...and {csvData.length - 5} more rows
              </p>
            )}

            <div className="mb-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              Account status: <strong>{autoApprove ? 'Active (with temporary passwords)' : 'Pending admin approval'}</strong>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Importing...' : `Import ${csvData.length} Actor${csvData.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && importResults && (
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Import Complete</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-700">{importResults.imported.length}</div>
                <div className="text-sm text-green-600">Successfully Imported</div>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                <div className="text-3xl font-bold text-red-700">{importResults.errors.length}</div>
                <div className="text-sm text-red-600">Errors</div>
              </div>
            </div>

            {importResults.imported.length > 0 && autoApprove && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3">
                  Temporary Passwords Generated
                </h4>
                <p className="text-sm text-blue-800 mb-3">
                  Share these credentials with your actors. They should log in at the Actor Portal and change their password.
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto bg-white p-3 rounded border border-blue-300">
                  {importResults.imported.map(actor => (
                    <div key={actor.id} className="flex justify-between items-center p-2 hover:bg-blue-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {actor._displayName || (actor.firstName + ' ' + actor.lastName)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {actor._displayEmail || actor.email}
                        </div>
                      </div>
                      <div className="font-mono text-sm bg-gray-100 px-3 py-1 rounded border border-gray-300">
                        {actor.tempPassword || 'Error: No password'}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const text = importResults.imported.map(a =>
                      (a._displayName || (a.firstName + ' ' + a.lastName)) + '\n' +
                      'Email: ' + (a._displayEmail || a.email) + '\n' +
                      'Password: ' + a.tempPassword + '\n'
                    ).join('\n');
                    navigator.clipboard.writeText(text).then(() => {
                      alert('Credentials copied to clipboard!');
                    }).catch(() => {
                      alert('Could not copy to clipboard. Please copy manually.');
                    });
                  }}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Copy All Credentials
                </button>
              </div>
            )}

            {importResults.errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-2">Import Errors</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {importResults.errors.map((error, idx) => (
                    <div key={idx} className="text-sm text-red-800 bg-white p-2 rounded border border-red-100">
                      <strong>Row {error.row}:</strong> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetImport}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Import Another File
              </button>
              <button
                type="button"
                onClick={() => {
                  resetImport();
                  if (onImportComplete) onImportComplete();
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Done — View Roster
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.ActorImportCSV = ActorImportCSV;
