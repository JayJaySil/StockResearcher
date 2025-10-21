'use client'

import React, { useCallback } from 'react'
import { FileRejection, useDropzone } from 'react-dropzone'
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { file } from 'better-auth'
import { toast } from 'sonner'

const Uploader = () => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Do something with the files
  }, [])

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (fileRejections.length === 0) return

    const hasTooMany = fileRejections.some((r) =>
      r.errors.some((e) => e.code === 'too-many-files')
    )
    const hasTooLarge = fileRejections.some((r) =>
      r.errors.some((e) => e.code === 'file-too-large')
    )

    if (hasTooMany) {
      toast.error('You can only upload one file at a time.')
    }

    if (hasTooLarge) {
      toast.error('The file is too large. Maximum size is 10MB.')
    }

    if (!hasTooMany && !hasTooLarge) {
      const fallback = fileRejections[0]?.errors[0]?.message || 'File upload rejected'
      toast.error(fallback)
    }
  }, [])
  
  const {getRootProps, getInputProps, isDragActive} = useDropzone({ 
    onDrop,
    onDropRejected,
    maxFiles: 1,
    maxSize: 1024 * 1024 * 10, // 10 MB
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    }
  });

   return (
    <Card className={cn('relative border-2 border-dashed duration-200 ease-in-out w-full h-64')} {...getRootProps()}>
      <CardContent className="flex flex-col justify-center items-center h-full">
        <input {...getInputProps()} />
        {
          isDragActive ?
            <p>Drop the files here ...</p> :
            <div className="flex flex-col items-center justify-center h-full w-full gap-y-3">
              <p>Drag 'n' drop some files here, or click to select files</p>
              <Button>Select Files</Button>
            </div>
        }
      </CardContent>
    </Card>
  )
}

export default Uploader
