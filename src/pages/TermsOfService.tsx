import React from 'react';
import { FileText, CheckCircle, AlertTriangle, Scale, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const TermsOfService: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Terms of Service</h1>
      </div>

      <p className="text-muted-foreground text-lg">
        Please read these terms carefully before using Smart Agents Generator. By using our service, you agree to be bound by these terms.
      </p>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Acceptance of Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              By accessing or using Smart Agents Generator, you agree to be bound by these Terms of Service 
              and all applicable laws and regulations. If you do not agree with any of these terms, you are 
              prohibited from using or accessing this service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Service Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>Smart Agents Generator provides:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>AI agent creation and configuration tools</li>
              <li>Multi-agent workflow orchestration</li>
              <li>Knowledge base management with RAG capabilities</li>
              <li>Real-time analytics and monitoring</li>
              <li>Team collaboration features</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>As a user, you agree to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the service in compliance with all applicable laws</li>
              <li>Not misuse or abuse the AI capabilities</li>
              <li>Respect intellectual property rights</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Limitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>You may not:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Attempt to gain unauthorized access to any systems</li>
              <li>Transmit any malicious code or interfere with the service</li>
              <li>Resell or redistribute the service without authorization</li>
              <li>Use the AI agents to generate harmful or misleading content</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Disclaimer & Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              Smart Agents Generator is provided "as is" without warranties of any kind. We do not guarantee 
              that the service will be uninterrupted, error-free, or meet your specific requirements. 
              We shall not be liable for any indirect, incidental, or consequential damages arising from 
              your use of the service.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
