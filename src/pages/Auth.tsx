import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AuthPage = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Lärarvy - Inloggning</CardTitle>
          <p className="text-muted-foreground">
            Logga in för att komma åt lärarverktyg och övningshantering
          </p>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="default"
            providers={[]}
            redirectTo={`${window.location.origin}/teacher`}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'E-postadress',
                  password_label: 'Lösenord',
                  button_label: 'Logga in',
                  loading_button_label: 'Loggar in...',
                  link_text: 'Har du redan ett konto? Logga in',
                },
                sign_up: {
                  email_label: 'E-postadress',
                  password_label: 'Lösenord',
                  button_label: 'Skapa konto',
                  loading_button_label: 'Skapar konto...',
                  link_text: 'Har du inget konto? Registrera dig',
                },
                forgotten_password: {
                  email_label: 'E-postadress',
                  button_label: 'Skicka återställningslänk',
                  link_text: 'Glömt lösenordet?',
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;