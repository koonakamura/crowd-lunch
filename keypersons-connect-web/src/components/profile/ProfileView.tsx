import React from 'react';
import { User } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ExternalLink, MapPin, Building, User as UserIcon, Globe, Phone, Linkedin } from 'lucide-react';

interface ProfileViewProps {
  user: User;
  onEdit: () => void;
  isOwnProfile?: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onEdit, isOwnProfile = false }) => {
  const getRoleLabel = (role: string) => {
    const roleLabels = {
      executive: 'Executive',
      decision_maker: 'Decision Maker',
      event_organizer: 'Event Organizer',
      operator: 'Operator',
    };
    return roleLabels[role as keyof typeof roleLabels] || role;
  };

  const getCompanySizeLabel = (size: string) => {
    const sizeLabels = {
      startup: 'Startup (1-10)',
      small: 'Small (11-50)',
      medium: 'Medium (51-200)',
      large: 'Large (201-1000)',
      enterprise: 'Enterprise (1000+)',
    };
    return sizeLabels[size as keyof typeof sizeLabels] || size;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{user.full_name}</CardTitle>
              <p className="text-lg text-muted-foreground">{user.position}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{user.company}</span>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{user.location}</span>
              </div>
            </div>
          </div>
          {isOwnProfile && (
            <Button onClick={onEdit} variant="outline">
              Edit Profile
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{getRoleLabel(user.role)}</Badge>
            <Badge variant="outline">{user.industry}</Badge>
            <Badge variant="outline">{getCompanySizeLabel(user.company_size)}</Badge>
          </div>
          
          {user.bio && (
            <div>
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground">{user.bio}</p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-4">
            {user.linkedin_url && (
              <a
                href={user.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm text-primary hover:underline"
              >
                <Linkedin className="w-4 h-4" />
                <span>LinkedIn</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            
            {user.website_url && (
              <a
                href={user.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm text-primary hover:underline"
              >
                <Globe className="w-4 h-4" />
                <span>Website</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            
            {user.phone && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{user.phone}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
