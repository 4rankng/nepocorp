import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tractorService, trailerService, containerService } from '@api/services';
import { queryKeys } from './queryKeys';
import { 
  VehicleFilters,
  CreateTractorRequest,
  UpdateTractorRequest,
  CreateTrailerRequest,
  UpdateTrailerRequest,
  CreateContainerRequest,
  UpdateContainerRequest
} from '@api/types';

// Tractor hooks
export const useTractors = (filters?: VehicleFilters & { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: queryKeys.tractors.list(filters),
    queryFn: () => tractorService.getAll(filters),
  });
};

export const useTractor = (id: number) => {
  return useQuery({
    queryKey: queryKeys.tractors.detail(id),
    queryFn: () => tractorService.getById(id),
    enabled: !!id,
  });
};

export const useActiveTractors = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: queryKeys.tractors.active(),
    queryFn: () => tractorService.getActive(page, limit),
  });
};

export const useCreateTractor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTractorRequest) => tractorService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tractors.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tractors.active() });
    },
  });
};

export const useUpdateTractor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTractorRequest }) => 
      tractorService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tractors.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tractors.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tractors.active() });
    },
  });
};

export const useDeleteTractor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => tractorService.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.tractors.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tractors.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tractors.active() });
    },
  });
};

// Trailer hooks
export const useTrailers = (filters?: VehicleFilters & { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: queryKeys.trailers.list(filters),
    queryFn: () => trailerService.getAll(filters),
  });
};

export const useTrailer = (id: number) => {
  return useQuery({
    queryKey: queryKeys.trailers.detail(id),
    queryFn: () => trailerService.getById(id),
    enabled: !!id,
  });
};

export const useActiveTrailers = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: queryKeys.trailers.active(),
    queryFn: () => trailerService.getActive(page, limit),
  });
};

export const useCreateTrailer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTrailerRequest) => trailerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trailers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trailers.active() });
    },
  });
};

export const useUpdateTrailer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTrailerRequest }) => 
      trailerService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trailers.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.trailers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trailers.active() });
    },
  });
};

export const useDeleteTrailer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => trailerService.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.trailers.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.trailers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trailers.active() });
    },
  });
};

// Container hooks
export const useContainers = (filters?: VehicleFilters & { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: queryKeys.containers.list(filters),
    queryFn: () => containerService.getAll(filters),
  });
};

export const useContainer = (id: number) => {
  return useQuery({
    queryKey: queryKeys.containers.detail(id),
    queryFn: () => containerService.getById(id),
    enabled: !!id,
  });
};

export const useActiveContainers = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: queryKeys.containers.active(),
    queryFn: () => containerService.getActive(page, limit),
  });
};

export const useCreateContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContainerRequest) => containerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.containers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.containers.active() });
    },
  });
};

export const useUpdateContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateContainerRequest }) => 
      containerService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.containers.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.containers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.containers.active() });
    },
  });
};

export const useDeleteContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => containerService.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.containers.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.containers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.containers.active() });
    },
  });
};