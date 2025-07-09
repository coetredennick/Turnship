import React, { useState } from 'react';
import { InlineLoading } from './Loading';

// Move InputField component outside to prevent re-creation on each render
const InputField = ({ 
  name, 
  label, 
  type = 'text', 
  required = false, 
  placeholder = '', 
  as = 'input',
  rows = 3,
  value,
  onChange,
  onBlur,
  disabled,
  hasError,
  error
}) => {
  const Component = as;
  
  return (
    <div className="mb-4">
      <label 
        htmlFor={name} 
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Component
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={as === 'textarea' ? rows : undefined}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
          hasError 
            ? 'border-red-300 focus:border-red-500' 
            : 'border-gray-300 focus:border-blue-500'
        }`}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError ? `${name}-error` : undefined}
      />
      {hasError && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

const AddConnectionForm = ({ onSubmit, onCancel, isLoading = false }) => {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    company: '',
    connection_type: '',
    job_title: '',
    industry: '',
    custom_connection_description: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validation rules
  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    return newErrors;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle input blur for validation
  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate this field
    const newErrors = validateForm();
    setErrors(prev => ({
      ...prev,
      [name]: newErrors[name] || ''
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    setErrors(newErrors);
    
    // Mark all fields as touched to show validation errors
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    if (Object.keys(newErrors).length === 0) {
      try {
        await onSubmit(formData);
        // Reset form on successful submission
        setFormData({
          email: '',
          full_name: '',
          company: '',
          connection_type: '',
          job_title: '',
          industry: '',
          custom_connection_description: '',
          notes: ''
        });
        setErrors({});
        setTouched({});
      } catch (error) {
        // Error handling is done by parent component
        console.error('Form submission error:', error);
      }
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      email: '',
      full_name: '',
      company: '',
      connection_type: '',
      job_title: '',
      industry: '',
      custom_connection_description: '',
      notes: ''
    });
    setErrors({});
    setTouched({});
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Add New Connection</h3>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          aria-label="Close form"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            name="email"
            label="Email"
            type="email"
            required
            placeholder="john.doe@company.com"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isLoading}
            hasError={touched.email && errors.email}
            error={errors.email}
          />
          
          <InputField
            name="full_name"
            label="Full Name"
            required
            placeholder="John Doe"
            value={formData.full_name}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isLoading}
            hasError={touched.full_name && errors.full_name}
            error={errors.full_name}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            name="company"
            label="Company"
            placeholder="TechCorp Inc."
            value={formData.company}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isLoading}
            hasError={touched.company && errors.company}
            error={errors.company}
          />
          
          <InputField
            name="connection_type"
            label="Connection Type"
            placeholder="Professional, Personal, etc."
            value={formData.connection_type}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isLoading}
            hasError={touched.connection_type && errors.connection_type}
            error={errors.connection_type}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            name="job_title"
            label="Job Title"
            placeholder="Software Engineer"
            value={formData.job_title}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isLoading}
            hasError={touched.job_title && errors.job_title}
            error={errors.job_title}
          />
          
          <InputField
            name="industry"
            label="Industry"
            placeholder="Technology, Finance, etc."
            value={formData.industry}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isLoading}
            hasError={touched.industry && errors.industry}
            error={errors.industry}
          />
        </div>

        <InputField
          name="custom_connection_description"
          label="How You Know Them"
          as="textarea"
          rows={3}
          placeholder="Met at career fair, referred by John Smith, found on LinkedIn, etc."
          value={formData.custom_connection_description}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isLoading}
          hasError={touched.custom_connection_description && errors.custom_connection_description}
          error={errors.custom_connection_description}
        />

        <InputField
          name="notes"
          label="Notes"
          as="textarea"
          rows={3}
          placeholder="How did you meet? What did you discuss? Any follow-up needed?"
          value={formData.notes}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isLoading}
          hasError={touched.notes && errors.notes}
          error={errors.notes}
        />

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <InlineLoading size={16} className="mr-2" />
                Adding...
              </>
            ) : (
              'Add Connection'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddConnectionForm;