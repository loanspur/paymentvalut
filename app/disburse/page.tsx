'use client'

import { useState } from 'react'
import { Send, RefreshCw } from 'lucide-react'
import NotificationSystem, { useNotifications } from '../../components/NotificationSystem'
import DisbursementForm from '../../components/DisbursementForm'

export default function DisbursePage() {
  const [showForm, setShowForm] = useState(true)
  const { notifications, addNotification, removeNotification } = useNotifications()

  const handleSuccess = () => {
    addNotification({
      type: 'success',
      title: 'Disbursement Sent',
      message: 'Your disbursement has been processed successfully'
    })
  }

  return (
    <>
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Send Money</h1>
          <p className="mt-2 text-gray-600">Initiate M-Pesa B2C disbursements to customers</p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Disbursement Form</h2>
                <p className="text-sm text-gray-500">Fill in the details to send money via M-Pesa</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="btn btn-primary"
              >
                {showForm ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Hide Form
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Show Form
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {showForm ? (
              <DisbursementForm
                isOpen={true}
                onClose={() => setShowForm(false)}
                onSuccess={handleSuccess}
                className="static"
              />
            ) : (
              <div className="text-center py-12">
                <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Form Hidden</h3>
                <p className="text-gray-500 mb-4">Click "Show Form" to display the disbursement form</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn btn-primary"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Show Form
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}