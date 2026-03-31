import { Metadata } from 'next';
import JDLibrary from '@/components/resume/JDLibrary';

export const metadata: Metadata = {
  title: 'JD Library | Pathwise',
  description: 'Save and manage job descriptions. Run your resume against multiple roles to find your best matches.',
};

export default function JDLibraryPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <JDLibrary />
      </div>
    </div>
  );
}
