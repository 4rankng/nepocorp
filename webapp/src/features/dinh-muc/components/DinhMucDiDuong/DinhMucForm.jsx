import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';

// Define validation schema with Zod
const routeSchema = z.object({
  ma_tuyen: z.string().min(1, 'Mã tuyến là bắt buộc'),
  diem_di: z.string().min(1, 'Điểm đi là bắt buộc'),
  diem_den: z.string().min(1, 'Điểm đến là bắt buộc'),
  containerNorms: z.record(z.number().min(0, 'Giá trị phải lớn hơn hoặc bằng 0')),
});

const DinhMucForm = ({ 
  editedData, 
  containerTypes, 
  onSubmit, 
  onCancel, 
  isSaving, 
  isEditing = false 
}) => {
  // Initialize form
  const methods = useForm({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      ma_tuyen: editedData?.ma_tuyen || '',
      diem_di: editedData?.diem_di || '',
      diem_den: editedData?.diem_den || '',
      containerNorms: editedData?.containerNorms || {},
    },
    mode: 'onChange',
  });

  const { register, handleSubmit, formState: { errors, isValid } } = methods;

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} sx={{ p: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 2 }}>
          <TextField
            {...register('ma_tuyen')}
            label="Mã tuyến"
            error={!!errors.ma_tuyen}
            helperText={errors.ma_tuyen?.message}
            size="small"
            disabled={isSaving}
          />
          <TextField
            {...register('diem_di')}
            label="Điểm đi"
            error={!!errors.diem_di}
            helperText={errors.diem_di?.message}
            size="small"
            disabled={isSaving}
          />
          <TextField
            {...register('diem_den')}
            label="Điểm đến"
            error={!!errors.diem_den}
            helperText={errors.diem_den?.message}
            size="small"
            disabled={isSaving}
          />
        </Box>

        {/* Container norms inputs */}
        {containerTypes && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
            {containerTypes.map(container => (
              <TextField
                key={container.ma_loai_cont}
                {...register(`containerNorms.${container.ma_loai_cont}`, {
                  valueAsNumber: true,
                })}
                label={`${container.ten_loai_cont} (VND)`}
                type="number"
                size="small"
                disabled={isSaving}
                error={!!errors.containerNorms?.[container.ma_loai_cont]}
                helperText={errors.containerNorms?.[container.ma_loai_cont]?.message}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSaving || !isValid}
            startIcon={isSaving && <CircularProgress size={16} />}
          >
            {isSaving ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </Box>
      </Box>
    </FormProvider>
  );
};

export default DinhMucForm;