import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileView } from '../profile/ProfileView';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Search, Users, LogOut } from 'lucide-react';
import { apiClient, User } from '../../lib/api';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'search'>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndustry, setSearchIndustry] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const results = await apiClient.searchUsers(
        searchQuery || undefined,
        searchIndustry || undefined,
        searchLocation || undefined
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-primary">Keypersons Connect</h1>
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'profile'
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  My Profile
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'search'
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Find Connections
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.full_name}</span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'profile' && (
          <div>
            {isEditingProfile ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Profile editing form would go here</p>
                <Button 
                  onClick={() => setIsEditingProfile(false)}
                  className="mt-4"
                >
                  Back to Profile
                </Button>
              </div>
            ) : (
              <ProfileView
                user={user}
                onEdit={() => setIsEditingProfile(true)}
                isOwnProfile={true}
              />
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="w-5 h-5" />
                  <span>Find Decision Makers</span>
                </CardTitle>
                <CardDescription>
                  Search for business executives and decision makers to connect with
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Input
                      placeholder="Search by name, company, or position..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Industry (e.g., Technology)"
                      value={searchIndustry}
                      onChange={(e) => setSearchIndustry(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Location (e.g., Tokyo, Japan)"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleSearch} disabled={isSearching} className="w-full md:w-auto">
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </CardContent>
            </Card>

            {searchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Search Results ({searchResults.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((person) => (
                      <Card key={person.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <h3 className="font-semibold">{person.full_name}</h3>
                            <p className="text-sm text-gray-600">{person.position}</p>
                            <p className="text-sm text-gray-600">{person.company}</p>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {person.role.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {person.industry}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500">{person.location}</p>
                            {person.bio && (
                              <p className="text-xs text-gray-600 line-clamp-2">{person.bio}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
