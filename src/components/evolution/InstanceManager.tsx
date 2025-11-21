"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Power,
  PowerOff,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EvolutionInstance {
  instanceName: string;
  status: 'connecting' | 'open' | 'close';
  phoneNumber?: string;
  description?: string;
}

export function InstanceManager() {
  const queryClient = useQueryClient();
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceDescription, setNewInstanceDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);

  // Fetch instâncias
  const { data: instances = [], isLoading: loadingInstances, refetch } = useQuery({
    queryKey: ['evolution-instances'],
    queryFn: async () => {
      const response = await fetch('/api/evolution/instances');
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Erro ao carregar instâncias');
      return data.instances as EvolutionInstance[];
    },
    refetchInterval: 30000, // Refetch a cada 30s
  });

  // Criar instância
  const createMutation = useMutation({
    mutationFn: async (data: { instanceName: string; description?: string }) => {
      const response = await fetch('/api/evolution/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro ao criar instância');
      return result;
    },
    onSuccess: (_, variables) => {
      toast.success('Instância criada com sucesso!');
      setNewInstanceName('');
      setNewInstanceDescription('');
      setShowCreateForm(false);
      setSelectedInstance(variables.instanceName); // Seleciona para mostrar QR Code
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar instância: ${error.message}`);
    },
  });

  // Deletar instância
  const deleteMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const response = await fetch(`/api/evolution/instances?instanceName=${instanceName}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro ao deletar instância');
      return result;
    },
    onSuccess: () => {
      toast.success('Instância deletada com sucesso!');
      setSelectedInstance(null);
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao deletar instância: ${error.message}`);
    },
  });

  // Conectar/Reconectar instância
  const connectMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const response = await fetch(`/api/evolution/instances/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro ao conectar instância');
      return result;
    },
    onSuccess: (_, instanceName) => {
      toast.success('Conectando instância...');
      setSelectedInstance(instanceName);
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao conectar: ${error.message}`);
    },
  });

  // Desconectar instância
  const logoutMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const response = await fetch(`/api/evolution/instances/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro ao desconectar instância');
      return result;
    },
    onSuccess: () => {
      toast.success('Instância desconectada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desconectar: ${error.message}`);
    },
  });

  const handleCreateInstance = () => {
    if (!newInstanceName.trim()) {
      toast.error('Nome da instância é obrigatório');
      return;
    }

    // Validar nome (apenas letras, números, hífen e underscore)
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!nameRegex.test(newInstanceName)) {
      toast.error('Nome inválido. Use apenas letras, números, hífen e underscore');
      return;
    }

    createMutation.mutate({
      instanceName: newInstanceName.trim(),
      description: newInstanceDescription.trim() || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Conectado</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Conectando</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Desconectado</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Instâncias WhatsApp</h2>
          <p className="text-sm text-gray-600 mt-1">
            Crie e gerencie instâncias Evolution API para envio de mensagens
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loadingInstances}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingInstances ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={createMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Instância
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-gray-900">Criar Nova Instância</CardTitle>
            <CardDescription className="text-gray-700">
              Configure uma nova instância WhatsApp via Evolution API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="instanceName">Nome da Instância *</Label>
              <Input
                id="instanceName"
                placeholder="ex: whatsapp-principal"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                disabled={createMutation.isPending}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use apenas letras, números, hífen (-) e underscore (_)
              </p>
            </div>

            <div>
              <Label htmlFor="instanceDescription">Descrição (Opcional)</Label>
              <Input
                id="instanceDescription"
                placeholder="ex: Instância principal para campanhas"
                value={newInstanceDescription}
                onChange={(e) => setNewInstanceDescription(e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateInstance}
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Instância
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewInstanceName('');
                  setNewInstanceDescription('');
                }}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instances List */}
      {loadingInstances ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm text-gray-600 mt-2">Carregando instâncias...</p>
        </div>
      ) : instances.length === 0 ? (
        <Card className="border-gray-200">
          <CardContent className="py-12">
            <div className="text-center">
              <Smartphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700">Nenhuma instância encontrada</p>
              <p className="text-sm text-gray-500 mt-2">
                Crie sua primeira instância WhatsApp clicando em &quot;Nova Instância&quot;
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {instances.map((instance) => (
            <Card key={instance.instanceName} className="border-gray-200 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Smartphone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-gray-900">{instance.instanceName}</CardTitle>
                      {instance.description && (
                        <p className="text-sm text-gray-600">{instance.description}</p>
                      )}
                      {instance.phoneNumber && (
                        <p className="text-sm text-gray-700 font-mono mt-1">
                          📱 {instance.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(instance.status)}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Actions */}
                <div className="flex gap-2">
                  {instance.status === 'close' && (
                    <Button
                      size="sm"
                      onClick={() => connectMutation.mutate(instance.instanceName)}
                      disabled={connectMutation.isPending}
                    >
                      <Power className="w-4 h-4 mr-2" />
                      Conectar
                    </Button>
                  )}

                  {instance.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => logoutMutation.mutate(instance.instanceName)}
                      disabled={logoutMutation.isPending}
                    >
                      <PowerOff className="w-4 h-4 mr-2" />
                      Desconectar
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja deletar a instância "${instance.instanceName}"?`)) {
                        deleteMutation.mutate(instance.instanceName);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Deletar
                  </Button>

                  {instance.status !== 'open' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedInstance(
                        selectedInstance === instance.instanceName ? null : instance.instanceName
                      )}
                    >
                      {selectedInstance === instance.instanceName ? 'Ocultar QR Code' : 'Ver QR Code'}
                    </Button>
                  )}
                </div>

                {/* QR Code Display */}
                {selectedInstance === instance.instanceName && instance.status !== 'open' && (
                  <QRCodeDisplay
                    instanceName={instance.instanceName}
                    onConnected={() => {
                      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
                    }}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Alert */}
      {instances.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">💡 Dicas:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Instâncias conectadas aparecerão automaticamente na lista de envio</li>
                  <li>Mantenha pelo menos 1 instância conectada para enviar WhatsApp</li>
                  <li>QR Codes expiram após alguns minutos - recarregue se necessário</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
