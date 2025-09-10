import React, { useState, useEffect } from 'react';

interface LegalDocument {
  id: number;
  document_type: string;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  created_at: string;
}

interface LegalDocumentsProps {
  documentType: 'terms' | 'privacy' | 'commerce_law';
}

export const LegalDocuments: React.FC<LegalDocumentsProps> = ({ documentType }) => {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`http://localhost:8000/legal/${documentType}`);
        if (response.ok) {
          const data = await response.json();
          setDocument(data);
        } else if (response.status === 404) {
          setError('法務文書が見つかりません');
        } else {
          setError('法務文書の取得に失敗しました');
        }
      } catch (err) {
        setError('ネットワークエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentType]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">文書が見つかりません</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{document.title}</h1>
        <div className="text-sm text-gray-500 mb-8">
          バージョン: {document.version} | 更新日: {new Date(document.created_at).toLocaleDateString('ja-JP')}
        </div>
        <div className="prose prose-lg max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
            {document.content}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default LegalDocuments;
