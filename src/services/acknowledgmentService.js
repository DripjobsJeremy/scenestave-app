/**
 * Acknowledgment Templates and Organization Info Service
 * Manages donor acknowledgment letter templates and organization information.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY_TEMPLATES = 'showsuite_acknowledgment_templates';
  const STORAGE_KEY_ORG_INFO = 'showsuite_org_info';

  /**
   * Get default templates
   */
  const getDefaultTemplates = () => {
    return {
      emailTemplate: `Dear {{first_name}},

Thank you for your generous donation of {{amount}} to {{org_name}}!

Your gift on {{date}} will help us continue our mission to bring exceptional theatre to our community. We are deeply grateful for your support.

Campaign: {{campaign}}

With sincere appreciation,
The {{org_name}} Team`,
      
      letterTemplate: `{{org_name}}
{{org_address}}

{{date}}

Dear {{donor_name}},

On behalf of {{org_name}}, I want to personally thank you for your generous contribution of {{amount}}.

Your donation to our {{campaign}} demonstrates your commitment to the arts and to our community. With the support of donors like you, we are able to continue bringing world-class theatre productions to audiences of all ages.

Your gift makes a real difference, and we are truly grateful for your partnership.

With warmest regards,

Executive Director
{{org_name}}`,
      
      receiptTemplate: `DONATION RECEIPT

{{org_name}}
{{org_address}}
Tax ID (EIN): {{ein}}

Receipt Number: {{receipt_number}}
Date: {{date}}

Donor Information:
{{donor_name}}

Donation Details:
Amount: {{amount}}
Campaign: {{campaign}}

This letter serves as your official receipt for tax purposes. {{org_name}} is a tax-exempt organization under Section 501(c)(3) of the Internal Revenue Code. Your donation is tax-deductible to the full extent allowed by law.

No goods or services were provided in exchange for this contribution.

Thank you for your generous support!`
    };
  };

  /**
   * Load acknowledgment templates from localStorage
   */
  const loadTemplates = () => {
    try {
      const templates = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      return templates ? JSON.parse(templates) : getDefaultTemplates();
    } catch (error) {
      console.error('Error loading templates:', error);
      return getDefaultTemplates();
    }
  };

  /**
   * Save acknowledgment templates to localStorage
   */
  const saveTemplates = (templates) => {
    try {
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving templates:', error);
      throw error;
    }
  };

  /**
   * Load organization info from localStorage
   */
  const loadOrgInfo = () => {
    try {
      const orgInfo = localStorage.getItem(STORAGE_KEY_ORG_INFO);
      return orgInfo ? JSON.parse(orgInfo) : {
        name: '',
        ein: '',
        address: ''
      };
    } catch (error) {
      console.error('Error loading org info:', error);
      return { name: '', ein: '', address: '' };
    }
  };

  /**
   * Save organization info to localStorage
   */
  const saveOrgInfo = (orgInfo) => {
    try {
      localStorage.setItem(STORAGE_KEY_ORG_INFO, JSON.stringify(orgInfo));
    } catch (error) {
      console.error('Error saving org info:', error);
      throw error;
    }
  };

  /**
   * Generate acknowledgment text from template and donation data
   */
  const generateAcknowledgment = (templateType, donationData, contactData) => {
    const templates = loadTemplates();
    const orgInfo = loadOrgInfo();
    
    const templateMap = {
      email: templates.emailTemplate,
      letter: templates.letterTemplate,
      receipt: templates.receiptTemplate
    };
    
    let template = templateMap[templateType];
    if (!template) return '';
    
    // Replace placeholders
    const replacements = {
      '{{donor_name}}': `${contactData.firstName} ${contactData.lastName}`,
      '{{first_name}}': contactData.firstName,
      '{{last_name}}': contactData.lastName,
      '{{amount}}': new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(donationData.amount),
      '{{date}}': new Date(donationData.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      '{{campaign}}': donationData.campaignName || 'General Operating Fund',
      '{{org_name}}': orgInfo.name,
      '{{org_address}}': orgInfo.address,
      '{{ein}}': orgInfo.ein,
      '{{receipt_number}}': `R-${new Date().getFullYear()}-${donationData.id.substring(0, 6)}`
    };
    
    Object.entries(replacements).forEach(([placeholder, value]) => {
      template = template.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return template;
  };

  // Export to global scope
  global.acknowledgmentService = {
    loadTemplates,
    saveTemplates,
    loadOrgInfo,
    saveOrgInfo,
    getDefaultTemplates,
    generateAcknowledgment
  };
})(window);
